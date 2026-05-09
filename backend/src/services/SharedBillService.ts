import mongoose from 'mongoose';
import {
  SharedBill,
  BillShare,
  Property,
} from '../models';
import { ISharedBill, IBillShare } from '../types';
import { AppError } from '../middleware';
import TenantService from './TenantService';
import NotificationService from './NotificationService';
import { getIO } from '../socket/socketServer';

interface CreateBillPayload {
  title: string;
  description?: string;
  category: ISharedBill['category'];
  totalAmount: number;
  splitMethod?: ISharedBill['splitMethod'];
  exemptTenantIds?: string[];
  creatorIncluded?: boolean;
  customAmounts?: { tenant: string; amount: number }[];
  bankDetails: ISharedBill['bankDetails'];
  dueDate?: Date;
}

interface ParticipantSnapshot {
  tenant: string;
  unit: string;
  unitNumber: string;
}

/**
 * Compute per-tenant share amounts for a bill. Pure function (no DB).
 *
 * Equal split with remainder: floor each share to the nearest naira and
 * distribute the leftover ₦ in increments of 1 to the first N participants
 * by `tenant._id` ascending. Deterministic and rounding-safe — the sum of
 * individual shares equals the bill total exactly.
 */
export function computeShares(
  participants: ParticipantSnapshot[],
  total: number,
  method: ISharedBill['splitMethod'],
  customAmounts: { tenant: string; amount: number }[] = []
): { tenant: string; unit: string; amount: number }[] {
  if (participants.length === 0) return [];

  if (method === 'custom') {
    return participants.map(p => {
      const custom = customAmounts.find(c => c.tenant === p.tenant);
      if (!custom) {
        throw new AppError(
          `Custom amount missing for tenant ${p.tenant}`,
          400
        );
      }
      return { tenant: p.tenant, unit: p.unit, amount: custom.amount };
    });
  }

  // 'equal' and 'by_unit_count' both split evenly across participants.
  // by_unit_count would diverge if we tracked occupants-per-unit, but for
  // Phase 1 each unit = one participant, so this collapses to equal.
  const sorted = [...participants].sort((a, b) =>
    a.tenant.localeCompare(b.tenant)
  );
  const baseShare = Math.floor(total / sorted.length);
  const remainder = total - baseShare * sorted.length;

  return sorted.map((p, i) => ({
    tenant: p.tenant,
    unit: p.unit,
    amount: baseShare + (i < remainder ? 1 : 0),
  }));
}

class SharedBillService {
  /**
   * Snapshot the building's current tenants, compute their shares, and create
   * the Bill + BillShare docs atomically. Notifies all participants except
   * the creator.
   */
  async createBill(creatorId: string, propertyId: string, payload: CreateBillPayload) {
    if (payload.totalAmount <= 0) {
      throw new AppError('Total amount must be greater than zero', 400);
    }

    const property = await Property.findById(propertyId).select('name owner');
    if (!property) throw new AppError('Property not found', 404);

    const members = await TenantService.getActiveTenantsForProperty(propertyId);
    const exemptSet = new Set(payload.exemptTenantIds || []);
    const creatorIncluded = payload.creatorIncluded !== false;

    // Build the snapshot — exclude exempted tenants and (optionally) the creator.
    const snapshot: ParticipantSnapshot[] = members
      .filter((m: any) => {
        const tenantId = m.tenant._id.toString();
        if (exemptSet.has(tenantId)) return false;
        if (!creatorIncluded && tenantId === creatorId) return false;
        return true;
      })
      .map((m: any) => ({
        tenant: m.tenant._id.toString(),
        unit: m.unit.id.toString(),
        unitNumber: m.unit.unitNumber,
      }));

    if (snapshot.length === 0) {
      throw new AppError(
        'No participants to split this bill among (everyone is exempt)',
        400
      );
    }

    const shares = computeShares(
      snapshot,
      payload.totalAmount,
      payload.splitMethod || 'equal',
      payload.customAmounts
    );

    // Atomic write — bill + shares must land together. Mongoose session
    // ensures we don't end up with a bill that has zero shares if the second
    // insert fails partway.
    const session = await mongoose.startSession();
    let billId: string;
    try {
      session.startTransaction();

      const [bill] = await SharedBill.create(
        [
          {
            property: propertyId,
            creator: creatorId,
            title: payload.title,
            description: payload.description,
            category: payload.category,
            totalAmount: payload.totalAmount,
            splitMethod: payload.splitMethod || 'equal',
            participantSnapshot: snapshot,
            creatorIncluded,
            bankDetails: payload.bankDetails,
            dueDate: payload.dueDate,
          },
        ],
        { session }
      );

      const shareDocs = shares.map(s => ({
        bill: bill._id,
        tenant: s.tenant,
        unit: s.unit,
        amount: s.amount,
        // If the creator opted in, mark their own share paid+confirmed
        // immediately so totals stay consistent.
        ...(s.tenant === creatorId
          ? { status: 'paid', markedPaidAt: new Date(), confirmedAt: new Date() }
          : {}),
      }));
      await BillShare.insertMany(shareDocs, { session });

      await session.commitTransaction();
      billId = bill._id.toString();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Fan out — notify every participant except the creator.
    const recipientIds = snapshot
      .map(s => s.tenant)
      .filter(id => id !== creatorId);
    await NotificationService.createMany(
      recipientIds,
      `New shared bill: ${payload.title}`,
      `A bill of ₦${payload.totalAmount.toLocaleString('en-NG')} has been created for ${property.name}. Open the app to see your share.`,
      'payment',
      { billId, propertyId }
    );

    // Live socket push to anyone in the building chat right now.
    try {
      const populated = await this.getBillDetail(billId, creatorId);
      getIO().to(`building:${propertyId}`).emit('bill:created', populated);
    } catch {
      /* socket optional */
    }

    return this.getBillDetail(billId, creatorId);
  }

  /**
   * List bills for a property. Tenants see all bills they're a participant of;
   * landlords/agents see all bills.
   */
  async listBillsForProperty(propertyId: string, status?: ISharedBill['status']) {
    const filter: any = { property: propertyId };
    if (status) filter.status = status;

    return SharedBill.find(filter)
      .populate('creator', 'firstName lastName avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * Cross-property bill list for a tenant. Used by the home card to show
   * "₦X owed across all your buildings".
   */
  async listMySharesAcrossProperties(userId: string, status?: IBillShare['status']) {
    const filter: any = { tenant: userId };
    if (status) filter.status = status;

    return BillShare.find(filter)
      .populate({
        path: 'bill',
        populate: [
          { path: 'creator', select: 'firstName lastName' },
          { path: 'property', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Bill + all shares (with tenant info populated) + paid/total counts so
   * the mobile detail screen can render a progress bar without doing math.
   */
  async getBillDetail(billId: string, _requesterId: string) {
    const bill = await SharedBill.findById(billId)
      .populate('creator', 'firstName lastName avatar')
      .populate('property', 'name address');
    if (!bill) throw new AppError('Bill not found', 404);

    const shares = await BillShare.find({ bill: billId })
      .populate('tenant', 'firstName lastName avatar')
      .populate('unit', 'unitNumber');

    const paidCount = shares.filter(
      s => s.status === 'paid' || s.status === 'exempt'
    ).length;
    const totalCount = shares.length;
    const amountPaid = shares
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      bill,
      shares,
      progress: {
        paidCount,
        totalCount,
        amountPaid,
        amountTotal: bill.totalAmount,
      },
    };
  }

  /**
   * Tenant taps "I've paid". Moves status unpaid → pending_confirmation.
   * Idempotent: no-op if already pending_confirmation or paid.
   */
  async markShareAsPaid(shareId: string, tenantId: string, note?: string) {
    const share = await BillShare.findById(shareId).populate({
      path: 'bill',
      select: 'creator title property',
    });
    if (!share) throw new AppError('Share not found', 404);
    if (share.tenant.toString() !== tenantId) {
      throw new AppError('Not your share', 403);
    }

    if (share.status === 'paid' || share.status === 'pending_confirmation') {
      return share;
    }
    if (share.status === 'exempt' || share.status === 'cancelled' as any) {
      throw new AppError(`Cannot mark a ${share.status} share as paid`, 400);
    }

    share.status = 'pending_confirmation';
    share.markedPaidAt = new Date();
    if (note) share.note = note;
    if (share.disputedAt) {
      share.disputedAt = undefined as any;
      share.disputeReason = undefined as any;
    }
    await share.save();

    // Notify the bill creator.
    const bill = share.bill as any;
    await NotificationService.createNotification(
      bill.creator.toString(),
      `Payment marked: ${bill.title}`,
      `A neighbor has marked their ₦${share.amount.toLocaleString('en-NG')} share as paid. Confirm receipt to settle it.`,
      'payment',
      { billId: bill._id.toString(), shareId: share._id.toString() }
    );

    this.broadcastShareUpdate(share);
    return share;
  }

  /**
   * Creator confirms they received the money. Moves pending_confirmation → paid.
   * Inside a transaction we recompute "all paid" and flip bill.status if so.
   */
  async confirmSharePayment(billId: string, shareId: string, creatorId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const bill = await SharedBill.findById(billId).session(session);
      if (!bill) throw new AppError('Bill not found', 404);
      if (bill.creator.toString() !== creatorId) {
        throw new AppError('Only the creator can confirm payments', 403);
      }

      const share = await BillShare.findById(shareId).session(session);
      if (!share || share.bill.toString() !== billId) {
        throw new AppError('Share not found on this bill', 404);
      }
      if (share.status !== 'pending_confirmation') {
        throw new AppError(
          `Cannot confirm a share with status "${share.status}"`,
          400
        );
      }

      share.status = 'paid';
      share.confirmedAt = new Date();
      await share.save({ session });

      const remaining = await BillShare.countDocuments({
        bill: billId,
        status: { $nin: ['paid', 'exempt'] },
      }).session(session);

      if (remaining === 0) {
        bill.status = 'settled';
        await bill.save({ session });
      }

      await session.commitTransaction();

      await NotificationService.createNotification(
        share.tenant.toString(),
        `Payment confirmed: ${bill.title}`,
        `Your ₦${share.amount.toLocaleString('en-NG')} share has been confirmed received.`,
        'payment',
        { billId: bill._id.toString(), shareId: share._id.toString() }
      );

      this.broadcastShareUpdate(share);
      return share;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Creator rejects a paid claim ("haven't seen the transfer"). Moves
   * pending_confirmation → disputed. Tenant gets a notification with reason.
   */
  async disputeShare(
    billId: string,
    shareId: string,
    creatorId: string,
    reason: string
  ) {
    const bill = await SharedBill.findById(billId).select('creator title');
    if (!bill) throw new AppError('Bill not found', 404);
    if (bill.creator.toString() !== creatorId) {
      throw new AppError('Only the creator can dispute', 403);
    }

    const share = await BillShare.findById(shareId);
    if (!share || share.bill.toString() !== billId) {
      throw new AppError('Share not found on this bill', 404);
    }
    if (share.status !== 'pending_confirmation') {
      throw new AppError(
        `Can only dispute a share that's pending confirmation`,
        400
      );
    }

    share.status = 'disputed';
    share.disputedAt = new Date();
    share.disputeReason = reason;
    await share.save();

    await NotificationService.createNotification(
      share.tenant.toString(),
      `Payment disputed: ${bill.title}`,
      `The bill creator says: "${reason}". Re-mark when resolved.`,
      'payment',
      { billId, shareId }
    );

    this.broadcastShareUpdate(share);
    return share;
  }

  /**
   * Cancel a bill. Only allowed if no share has been confirmed paid yet —
   * otherwise the creator should refund out-of-band and we shouldn't lose
   * the audit trail.
   */
  async cancelBill(billId: string, creatorId: string) {
    const bill = await SharedBill.findById(billId);
    if (!bill) throw new AppError('Bill not found', 404);
    if (bill.creator.toString() !== creatorId) {
      throw new AppError('Only the creator can cancel', 403);
    }
    if (bill.status !== 'open') {
      throw new AppError(`Cannot cancel a ${bill.status} bill`, 400);
    }

    const anyConfirmed = await BillShare.exists({ bill: billId, status: 'paid' });
    if (anyConfirmed) {
      throw new AppError(
        'Cannot cancel — a share has already been confirmed paid',
        400
      );
    }

    bill.status = 'cancelled';
    await bill.save();
    return bill;
  }

  /**
   * Push a share update to everyone in the building chat room AND to the
   * specific tenant's user room (since they may not have joined the building
   * room from another screen).
   */
  private broadcastShareUpdate(share: IBillShare): void {
    try {
      const io = getIO();
      // Need the propertyId; fetch it cheaply from the bill.
      SharedBill.findById(share.bill)
        .select('property')
        .then(b => {
          if (!b) return;
          io.to(`building:${b.property.toString()}`).emit('bill:share-updated', share);
          io.to(`user:${share.tenant.toString()}`).emit('bill:share-updated', share);
        })
        .catch(() => {});
    } catch {
      /* socket optional */
    }
  }

}

export default new SharedBillService();
