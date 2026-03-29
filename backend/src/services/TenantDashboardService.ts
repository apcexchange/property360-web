import axios from 'axios';
import crypto from 'crypto';
import { User, Lease, Property, Unit, Transaction, MaintenanceRequest, Invoice, Receipt, PaymentGateway } from '../models';
import { IUser, ILease, ITransaction, IMaintenanceRequest, IInvoice, IReceipt } from '../types';
import { AppError } from '../middleware';
import { config } from '../config';
import NotificationService from './NotificationService';
import emailOtpService from './EmailOtpService';

function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

interface TenantLeaseInfo {
  lease: {
    id: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    paymentFrequency: string;
    status: string;
    securityDeposit: number;
    cautionFee: number;
    agentFee: number;
    agreementFee: number;
    legalFee: number;
    serviceCharge: number;
    otherFee: number;
    otherFeeDescription: string;
  };
  property: {
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
  };
  landlord: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface FeeItem {
  label: string;
  amount: number;
  paid: number;
  pending: number;
  outstanding: number;
  type: string; // transaction type for tracking
}

interface PaymentSummary {
  monthlyRent: number;
  nextDueDate: Date | null;
  daysUntilDue: number;
  totalPaid: number;
  outstandingBalance: number;
  rentOutstanding: number;
  rentPaid: number;
  rentPending: number;
  fees: FeeItem[];
  totalFeesDue: number;
  totalFeesPaid: number;
  totalFeesOutstanding: number;
}

export class TenantDashboardService {
  /**
   * Get tenant's active lease info with property, unit, and landlord details
   */
  async getTenantLeaseInfo(tenantId: string): Promise<TenantLeaseInfo | null> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber bedrooms bathrooms')
      .populate('landlord', 'firstName lastName email phone');

    if (!lease) {
      return null;
    }

    const property = lease.property as any;
    const unit = lease.unit as any;
    const landlord = lease.landlord as any;

    return {
      lease: {
        id: lease._id.toString(),
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount,
        paymentFrequency: lease.paymentFrequency,
        status: lease.status,
        // One-time fees
        securityDeposit: lease.securityDeposit,
        cautionFee: lease.cautionFee,
        agentFee: lease.agentFee,
        agreementFee: lease.agreementFee,
        legalFee: lease.legalFee,
        serviceCharge: lease.serviceCharge,
        otherFee: lease.otherFee,
        otherFeeDescription: lease.otherFeeDescription,
      },
      property: {
        id: property._id.toString(),
        name: property.name,
        address: property.address,
      },
      unit: {
        id: unit._id.toString(),
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
      },
      landlord: {
        id: landlord._id.toString(),
        firstName: landlord.firstName,
        lastName: landlord.lastName,
        email: landlord.email,
        phone: landlord.phone,
      },
    };
  }

  /**
   * Get payment summary for tenant
   */
  async getPaymentSummary(tenantId: string): Promise<PaymentSummary> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      return {
        monthlyRent: 0,
        nextDueDate: null,
        daysUntilDue: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        rentOutstanding: 0,
        rentPaid: 0,
        rentPending: 0,
        fees: [],
        totalFeesDue: 0,
        totalFeesPaid: 0,
        totalFeesOutstanding: 0,
      };
    }

    // Get all completed and pending payments for this lease
    const payments = await Transaction.find({
      lease: lease._id,
      tenant: tenantId,
      status: { $in: ['completed', 'pending'] },
    });

    // Separate by type and status
    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending');

    const rentPaidCompleted = completedPayments.filter(p => p.type === 'rent');
    const rentPending = pendingPayments.filter(p => p.type === 'rent');
    const feePaidCompleted = completedPayments.filter(p => p.type === 'deposit' || p.type === 'other');
    const feePending = pendingPayments.filter(p => p.type === 'deposit' || p.type === 'other');

    const totalRentPaid = rentPaidCompleted.reduce((sum, p) => sum + p.amount, 0);
    const totalRentPending = rentPending.reduce((sum, p) => sum + p.amount, 0);
    const totalFeesPaid = feePaidCompleted.reduce((sum, p) => sum + p.amount, 0);
    const totalFeesPending = feePending.reduce((sum, p) => sum + p.amount, 0);

    // Calculate expected rent payments based on lease duration and payment frequency
    // rentAmount is the amount per payment period (monthly/quarterly/annually)
    // The first period is due immediately, so a lease that started this month = 1 period due
    const now = new Date();
    const leaseStart = new Date(lease.startDate);
    const leaseEnd = new Date(lease.endDate);
    const monthsElapsed = this.getMonthsDifference(leaseStart, now > leaseEnd ? leaseEnd : now);

    let periodsElapsed = 0;
    switch (lease.paymentFrequency) {
      case 'monthly':
        periodsElapsed = monthsElapsed;
        break;
      case 'quarterly':
        periodsElapsed = Math.ceil(monthsElapsed / 3);
        break;
      case 'annually':
        periodsElapsed = Math.ceil(monthsElapsed / 12);
        break;
    }
    const expectedRent = Math.max(0, periodsElapsed) * lease.rentAmount;

    // Build fee breakdown
    const feeDefinitions: { label: string; amount: number; type: string }[] = [
      { label: 'Security Deposit', amount: lease.securityDeposit, type: 'deposit' },
      { label: 'Caution Fee', amount: lease.cautionFee, type: 'deposit' },
      { label: 'Agent Fee', amount: lease.agentFee, type: 'other' },
      { label: 'Agreement Fee', amount: lease.agreementFee, type: 'other' },
      { label: 'Legal Fee', amount: lease.legalFee, type: 'other' },
      { label: 'Service Charge', amount: lease.serviceCharge, type: 'other' },
    ];

    if (lease.otherFee > 0) {
      feeDefinitions.push({
        label: lease.otherFeeDescription || 'Other Fee',
        amount: lease.otherFee,
        type: 'other',
      });
    }

    // Distribute fee payments across fee items (simple allocation in order)
    let remainingFeePaid = totalFeesPaid;
    let remainingFeePending = totalFeesPending;
    const fees: FeeItem[] = feeDefinitions
      .filter(f => f.amount > 0)
      .map(f => {
        const paid = Math.min(f.amount, remainingFeePaid);
        remainingFeePaid = Math.max(0, remainingFeePaid - paid);
        const pendingForFee = Math.min(f.amount - paid, remainingFeePending);
        remainingFeePending = Math.max(0, remainingFeePending - pendingForFee);
        return {
          label: f.label,
          amount: f.amount,
          paid,
          pending: pendingForFee,
          outstanding: Math.max(0, f.amount - paid - pendingForFee),
          type: f.type,
        };
      });

    const totalFeesDue = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalFeesOutstanding = fees.reduce((sum, f) => sum + f.outstanding, 0);

    // Calculate next due date based on payment frequency
    const nextDueDate = this.calculateNextDueDate(lease.startDate, lease.paymentFrequency);
    const daysUntilDue = nextDueDate ? Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const rentOutstanding = Math.max(0, expectedRent - totalRentPaid);

    return {
      monthlyRent: lease.rentAmount,
      nextDueDate,
      daysUntilDue: Math.max(0, daysUntilDue),
      totalPaid: totalRentPaid + totalFeesPaid,
      outstandingBalance: rentOutstanding + totalFeesOutstanding,
      rentOutstanding,
      rentPaid: totalRentPaid,
      rentPending: totalRentPending,
      fees,
      totalFeesDue,
      totalFeesPaid,
      totalFeesOutstanding,
    };
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ payments: ITransaction[]; total: number }> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: { $in: ['active', 'expired', 'terminated'] },
    });

    if (!lease) {
      return { payments: [], total: 0 };
    }

    const query: any = {
      lease: lease._id,
      tenant: tenantId,
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    const total = await Transaction.countDocuments(query);
    const payments = await Transaction.find(query)
      .sort({ paymentDate: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 20);

    return { payments, total };
  }

  /**
   * Get upcoming payments for tenant
   * Returns invoices that are due or upcoming for online payment
   */
  async getUpcomingPayments(tenantId: string): Promise<any[]> {
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      return [];
    }

    // Get invoices for this tenant that are not fully paid
    const invoices = await Invoice.find({
      tenant: tenantId,
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    }).sort({ dueDate: 1 });

    // Convert invoices to upcoming payment format
    const upcomingPayments = invoices.map((invoice) => ({
      dueDate: invoice.dueDate,
      amount: invoice.amountDue || invoice.total,
      status: invoice.status === 'overdue' ? 'overdue' : 'pending',
      paymentId: invoice._id.toString(), // Invoice ID for payment
      invoiceNumber: invoice.invoiceNumber,
    }));

    // If no invoices found, fall back to payment schedule
    if (upcomingPayments.length === 0) {
      const scheduledPayments = [];
      let dueDate = this.calculateNextDueDate(lease.startDate, lease.paymentFrequency);

      for (let i = 0; i < 3 && dueDate && dueDate <= lease.endDate; i++) {
        // Check if this payment has been made
        const existingPayment = await Transaction.findOne({
          lease: lease._id,
          paymentDate: {
            $gte: this.getPaymentPeriodStart(dueDate, lease.paymentFrequency),
            $lte: dueDate,
          },
          status: 'completed',
        });

        if (!existingPayment) {
          scheduledPayments.push({
            dueDate,
            amount: lease.rentAmount,
            status: dueDate < new Date() ? 'overdue' : 'pending',
            paymentId: null, // No invoice yet
          });
        }

        dueDate = this.getNextPaymentDate(dueDate, lease.paymentFrequency);
      }

      return scheduledPayments;
    }

    return upcomingPayments;
  }

  /**
   * Get tenant's receipts
   */
  async getTenantReceipts(
    tenantId: string,
    filters?: {
      limit?: number;
      page?: number;
    }
  ): Promise<{ receipts: IReceipt[]; total: number; pages: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = { tenant: tenantId };

    const [receipts, total] = await Promise.all([
      Receipt.find(query)
        .populate('property', 'name')
        .populate('unit', 'unitNumber')
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit),
      Receipt.countDocuments(query),
    ]);

    return {
      receipts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single receipt
   */
  async getTenantReceipt(receiptId: string, tenantId: string): Promise<IReceipt | null> {
    return Receipt.findOne({
      _id: receiptId,
      tenant: tenantId,
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('transaction');
  }

  /**
   * Get maintenance requests for tenant
   */
  async getMaintenanceRequests(
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ requests: IMaintenanceRequest[]; total: number }> {
    const query: any = { tenant: tenantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    const total = await MaintenanceRequest.countDocuments(query);
    const requests = await MaintenanceRequest.find(query)
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 20);

    return { requests, total };
  }

  /**
   * Create a maintenance request
   */
  async createMaintenanceRequest(
    tenantId: string,
    data: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      images?: string[];
    }
  ): Promise<IMaintenanceRequest> {
    // Get tenant's active lease to determine property and unit
    const lease = await Lease.findOne({
      tenant: tenantId,
      status: 'active',
    });

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    const request = await MaintenanceRequest.create({
      property: lease.property,
      unit: lease.unit,
      tenant: tenantId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      images: data.images || [],
      status: 'pending',
    });

    return request;
  }

  /**
   * Cancel a maintenance request
   */
  async cancelMaintenanceRequest(
    requestId: string,
    tenantId: string
  ): Promise<IMaintenanceRequest> {
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant: tenantId,
    });

    if (!request) {
      throw new AppError('Maintenance request not found', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be cancelled', 400);
    }

    request.status = 'cancelled';
    await request.save();

    return request;
  }

  /**
   * Get a single maintenance request
   */
  async getMaintenanceRequestById(
    requestId: string,
    tenantId: string
  ): Promise<IMaintenanceRequest | null> {
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant: tenantId,
    })
      .populate('property', 'name address')
      .populate('unit', 'unitNumber');

    return request;
  }

  // ============ Lease Invitations ============

  async getPendingInvitations(tenantId: string) {
    const leases = await Lease.find({
      tenant: tenantId,
      status: 'pending',
    })
      .populate('property', 'name address images')
      .populate('unit', 'unitNumber bedrooms bathrooms size')
      .populate('landlord', 'firstName lastName email phone avatar')
      .sort({ createdAt: -1 });

    return leases.map((lease: any) => ({
      leaseId: lease._id.toString(),
      property: {
        id: lease.property._id.toString(),
        name: lease.property.name,
        address: lease.property.address,
        image: lease.property.images?.[0] || null,
      },
      unit: {
        id: lease.unit._id.toString(),
        unitNumber: lease.unit.unitNumber,
        bedrooms: lease.unit.bedrooms,
        bathrooms: lease.unit.bathrooms,
        size: lease.unit.size,
      },
      landlord: {
        id: lease.landlord._id.toString(),
        firstName: lease.landlord.firstName,
        lastName: lease.landlord.lastName,
        email: lease.landlord.email,
        phone: lease.landlord.phone,
        avatar: lease.landlord.avatar,
      },
      lease: {
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount,
        paymentFrequency: lease.paymentFrequency,
        securityDeposit: lease.securityDeposit,
        cautionFee: lease.cautionFee,
        agentFee: lease.agentFee,
        agreementFee: lease.agreementFee,
        legalFee: lease.legalFee,
        serviceCharge: lease.serviceCharge,
        otherFee: lease.otherFee,
        otherFeeDescription: lease.otherFeeDescription,
      },
      createdAt: lease.createdAt,
    }));
  }

  async getInvitationDetails(leaseId: string, tenantId: string) {
    const lease = await Lease.findOne({
      _id: leaseId,
      tenant: tenantId,
    })
      .populate('property', 'name address images propertyType')
      .populate('unit', 'unitNumber bedrooms bathrooms size rentAmount')
      .populate('landlord', 'firstName lastName email phone avatar');

    if (!lease) {
      throw new AppError('Invitation not found', 404);
    }

    const property = lease.property as any;
    const unit = lease.unit as any;
    const landlord = lease.landlord as any;

    return {
      leaseId: lease._id.toString(),
      property: {
        id: property._id.toString(),
        name: property.name,
        address: property.address,
        images: property.images,
        propertyType: property.propertyType,
      },
      unit: {
        id: unit._id.toString(),
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        size: unit.size,
      },
      landlord: {
        id: landlord._id.toString(),
        firstName: landlord.firstName,
        lastName: landlord.lastName,
        email: landlord.email,
        phone: landlord.phone,
        avatar: landlord.avatar,
      },
      lease: {
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmount: lease.rentAmount,
        paymentFrequency: lease.paymentFrequency,
        securityDeposit: lease.securityDeposit,
        cautionFee: lease.cautionFee,
        agentFee: lease.agentFee,
        agreementFee: lease.agreementFee,
        legalFee: lease.legalFee,
        serviceCharge: lease.serviceCharge,
        otherFee: lease.otherFee,
        otherFeeDescription: lease.otherFeeDescription,
      },
      status: lease.status,
      createdAt: lease.createdAt,
    };
  }

  async acceptInvitation(leaseId: string, tenantId: string) {
    const lease = await Lease.findOne({
      _id: leaseId,
      tenant: tenantId,
      status: 'pending',
    });

    if (!lease) {
      throw new AppError('Invitation not found or already responded', 404);
    }

    // Activate the lease
    lease.status = 'active';
    await lease.save();

    // Mark unit as occupied
    const unit = await Unit.findById(lease.unit);
    if (unit) {
      unit.isOccupied = true;
      unit.tenant = lease.tenant;
      // Auto-unlist from marketplace
      unit.isListed = false;
      unit.listingStatus = 'inactive';
      unit.reservedBy = undefined;
      unit.reservedAt = undefined;
      unit.reservationExpiresAt = undefined;
      await unit.save();
    }

    // Get names for notifications
    const [tenant, landlord, property] = await Promise.all([
      User.findById(tenantId).select('firstName lastName'),
      User.findById(lease.landlord).select('firstName lastName email'),
      Property.findById(lease.property).select('name'),
    ]);

    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const unitNumber = unit?.unitNumber || '';
    const propertyName = property?.name || '';

    // Notify landlord
    NotificationService.createNotification(
      lease.landlord.toString(),
      'Lease Invitation Accepted',
      `${tenantName} has accepted the lease invitation for Unit ${unitNumber} at ${propertyName}.`,
      'invitation',
      { leaseId: lease._id.toString(), tenantName, propertyName, unitNumber, status: 'accepted' }
    ).catch(err => console.error('[TenantDashboard] Failed to notify landlord:', err));

    // Email landlord
    if (landlord?.email) {
      emailOtpService.sendLeaseInvitationResponse(
        landlord.email,
        `${landlord.firstName} ${landlord.lastName}`,
        tenantName,
        propertyName,
        unitNumber,
        'accepted'
      ).catch(err => console.error('[TenantDashboard] Failed to email landlord:', err));
    }

    return { message: 'Lease invitation accepted successfully' };
  }

  async declineInvitation(leaseId: string, tenantId: string) {
    const lease = await Lease.findOne({
      _id: leaseId,
      tenant: tenantId,
      status: 'pending',
    });

    if (!lease) {
      throw new AppError('Invitation not found or already responded', 404);
    }

    // Mark lease as declined
    lease.status = 'declined';
    await lease.save();

    // Get names for notifications
    const [tenant, landlord, unit, property] = await Promise.all([
      User.findById(tenantId).select('firstName lastName'),
      User.findById(lease.landlord).select('firstName lastName email'),
      Unit.findById(lease.unit).select('unitNumber'),
      Property.findById(lease.property).select('name'),
    ]);

    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const unitNumber = unit?.unitNumber || '';
    const propertyName = property?.name || '';

    // Notify landlord
    NotificationService.createNotification(
      lease.landlord.toString(),
      'Lease Invitation Declined',
      `${tenantName} has declined the lease invitation for Unit ${unitNumber} at ${propertyName}.`,
      'invitation',
      { leaseId: lease._id.toString(), tenantName, propertyName, unitNumber, status: 'declined' }
    ).catch(err => console.error('[TenantDashboard] Failed to notify landlord:', err));

    // Email landlord
    if (landlord?.email) {
      emailOtpService.sendLeaseInvitationResponse(
        landlord.email,
        `${landlord.firstName} ${landlord.lastName}`,
        tenantName,
        propertyName,
        unitNumber,
        'declined'
      ).catch(err => console.error('[TenantDashboard] Failed to email landlord:', err));
    }

    return { message: 'Lease invitation declined' };
  }

  // ============ Fee Payments ============

  /**
   * Record a cash/offline fee payment (creates a pending transaction for landlord to confirm)
   */
  /**
   * Record a rent payment (cash/offline)
   */
  async markRentPaid(
    tenantId: string,
    data: { amount: number; paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'other'; notes?: string }
  ) {
    const lease = await Lease.findOne({ tenant: tenantId, status: 'active' })
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    if (data.amount <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    const reference = `P360-RENT-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    const transaction = await Transaction.create({
      lease: lease._id,
      tenant: tenantId,
      landlord: lease.landlord,
      amount: data.amount,
      type: 'rent',
      status: 'pending',
      paymentMethod: data.paymentMethod,
      reference,
      description: 'Rent payment',
      paymentDate: new Date(),
      recordedBy: tenantId,
      notes: data.notes || 'Rent marked as paid by tenant — awaiting landlord confirmation',
    });

    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const property = lease.property as any;
    const unit = lease.unit as any;

    NotificationService.createNotification(
      lease.landlord.toString(),
      'Rent Payment — Confirm',
      `${tenantName} says they paid rent (${formatAmount(data.amount)}) for Unit ${unit?.unitNumber} at ${property?.name}. Please confirm or reject.`,
      'payment',
      { leaseId: lease._id.toString(), amount: data.amount, transactionId: transaction._id.toString(), action: 'confirm_payment' }
    ).catch(err => console.error('[TenantDashboard] Failed to notify landlord:', err));

    return {
      transactionId: transaction._id.toString(),
      amount: data.amount,
      status: 'pending',
    };
  }

  async markFeePaid(
    tenantId: string,
    data: { feeType: string; amount: number; paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'other'; notes?: string }
  ) {
    const lease = await Lease.findOne({ tenant: tenantId, status: 'active' })
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    // Map fee type to transaction type
    const transactionType = ['securityDeposit', 'cautionFee'].includes(data.feeType) ? 'deposit' : 'other';

    // Get the fee label for description
    const feeLabels: Record<string, string> = {
      securityDeposit: 'Security Deposit',
      cautionFee: 'Caution Fee',
      agentFee: 'Agent Fee',
      agreementFee: 'Agreement Fee',
      legalFee: 'Legal Fee',
      serviceCharge: 'Service Charge',
      otherFee: (lease as any).otherFeeDescription || 'Other Fee',
    };

    const feeLabel = feeLabels[data.feeType];
    if (!feeLabel) {
      throw new AppError('Invalid fee type', 400);
    }

    // Validate amount against fee
    const feeAmount = (lease as any)[data.feeType] || 0;
    if (feeAmount <= 0) {
      throw new AppError('This fee is not applicable to your lease', 400);
    }

    if (data.amount <= 0 || data.amount > feeAmount) {
      throw new AppError(`Payment amount must be between 1 and ${feeAmount}`, 400);
    }

    const reference = `P360-FEE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    const transaction = await Transaction.create({
      lease: lease._id,
      tenant: tenantId,
      landlord: lease.landlord,
      amount: data.amount,
      type: transactionType,
      status: 'pending',
      paymentMethod: data.paymentMethod,
      reference,
      description: `${feeLabel} payment`,
      paymentDate: new Date(),
      recordedBy: tenantId,
      notes: data.notes || `${feeLabel} marked as paid by tenant — awaiting landlord confirmation`,
    });

    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const property = lease.property as any;
    const unit = lease.unit as any;

    NotificationService.createNotification(
      lease.landlord.toString(),
      `${feeLabel} Payment — Confirm`,
      `${tenantName} says they paid ${feeLabel} (${formatAmount(data.amount)}) for Unit ${unit?.unitNumber} at ${property?.name}. Please confirm or reject.`,
      'payment',
      { leaseId: lease._id.toString(), feeType: data.feeType, amount: data.amount, transactionId: transaction._id.toString(), action: 'confirm_payment' }
    ).catch(err => console.error('[TenantDashboard] Failed to notify landlord:', err));

    return {
      transactionId: transaction._id.toString(),
      feeType: data.feeType,
      feeLabel,
      amount: data.amount,
      status: 'pending',
    };
  }

  /**
   * Mark all outstanding fees as paid at once
   */
  async markAllFeesPaid(
    tenantId: string,
    paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'other'
  ) {
    const lease = await Lease.findOne({ tenant: tenantId, status: 'active' })
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    // Get existing fee payments
    const existingPayments = await Transaction.find({
      lease: lease._id,
      tenant: tenantId,
      type: { $in: ['deposit', 'other'] },
      status: 'completed',
    });
    const totalFeesPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Build fee list and calculate outstanding
    const feeDefinitions = [
      { label: 'Security Deposit', amount: lease.securityDeposit, type: 'deposit' },
      { label: 'Caution Fee', amount: lease.cautionFee, type: 'deposit' },
      { label: 'Agent Fee', amount: lease.agentFee, type: 'other' },
      { label: 'Agreement Fee', amount: lease.agreementFee, type: 'other' },
      { label: 'Legal Fee', amount: lease.legalFee, type: 'other' },
      { label: 'Service Charge', amount: lease.serviceCharge, type: 'other' },
    ];
    if (lease.otherFee > 0) {
      feeDefinitions.push({ label: lease.otherFeeDescription || 'Other Fee', amount: lease.otherFee, type: 'other' });
    }

    const totalFeesDue = feeDefinitions.reduce((sum, f) => sum + f.amount, 0);
    const totalOutstanding = Math.max(0, totalFeesDue - totalFeesPaid);

    if (totalOutstanding <= 0) {
      throw new AppError('All fees are already paid', 400);
    }

    const reference = `P360-ALLFEE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    const transaction = await Transaction.create({
      lease: lease._id,
      tenant: tenantId,
      landlord: lease.landlord,
      amount: totalOutstanding,
      type: 'other',
      status: 'pending',
      paymentMethod,
      reference,
      description: 'All outstanding fees payment',
      paymentDate: new Date(),
      recordedBy: tenantId,
      notes: 'All outstanding fees marked as paid by tenant — awaiting landlord confirmation',
    });

    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const property = lease.property as any;
    const unit = lease.unit as any;

    NotificationService.createNotification(
      lease.landlord.toString(),
      'All Fees Payment — Confirm',
      `${tenantName} says they paid all fees (${formatAmount(totalOutstanding)}) for Unit ${unit?.unitNumber} at ${property?.name}. Please confirm or reject.`,
      'payment',
      { leaseId: lease._id.toString(), amount: totalOutstanding, transactionId: transaction._id.toString(), action: 'confirm_payment' }
    ).catch(err => console.error('[TenantDashboard] Failed to notify landlord:', err));

    return {
      transactionId: transaction._id.toString(),
      amount: totalOutstanding,
      status: 'completed',
    };
  }

  /**
   * Initiate Paystack payment for all outstanding fees
   */
  async initiateAllFeesPayment(
    tenantId: string,
    data: { email: string; callbackUrl?: string }
  ) {
    const lease = await Lease.findOne({ tenant: tenantId, status: 'active' });
    if (!lease) throw new AppError('No active lease found', 400);

    const existingPayments = await Transaction.find({
      lease: lease._id, tenant: tenantId,
      type: { $in: ['deposit', 'other'] }, status: 'completed',
    });
    const totalFeesPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    const feeItems = [
      lease.securityDeposit, lease.cautionFee, lease.agentFee,
      lease.agreementFee, lease.legalFee, lease.serviceCharge, lease.otherFee,
    ];
    const totalFeesDue = feeItems.reduce((sum, f) => sum + f, 0);
    const totalOutstanding = Math.max(0, totalFeesDue - totalFeesPaid);

    if (totalOutstanding <= 0) throw new AppError('All fees are already paid', 400);

    const reference = `P360-ALLFEE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    const paymentGateway = await PaymentGateway.create({
      reference,
      tenant: tenantId,
      landlord: lease.landlord,
      amount: totalOutstanding,
      gateway: 'paystack',
      status: 'pending',
      metadata: { type: 'all_fees_payment', leaseId: lease._id.toString() },
    });

    try {
      const paystackSecretKey = config.paystack?.secretKey || '';
      const response = await axios.post<any>(
        'https://api.paystack.co/transaction/initialize',
        {
          email: data.email,
          amount: Math.round(totalOutstanding * 100),
          reference,
          callback_url: data.callbackUrl || config.paystack?.callbackUrl,
          metadata: {
            type: 'all_fees_payment',
            leaseId: lease._id.toString(),
            tenantId,
            paymentGatewayId: paymentGateway._id.toString(),
          },
        },
        { headers: { Authorization: `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data.status) throw new AppError('Failed to initialize payment', 500);

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
        amount: totalOutstanding,
      };
    } catch (error: any) {
      await PaymentGateway.findByIdAndUpdate(paymentGateway._id, { status: 'failed', gatewayResponse: error.response?.data || error.message });
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to initialize payment', 500);
    }
  }

  /**
   * Initiate Paystack payment for a fee
   */
  async initiateFeePayment(
    tenantId: string,
    data: { feeType: string; amount: number; email: string; callbackUrl?: string }
  ) {
    const lease = await Lease.findOne({ tenant: tenantId, status: 'active' });

    if (!lease) {
      throw new AppError('No active lease found', 400);
    }

    const feeLabels: Record<string, string> = {
      securityDeposit: 'Security Deposit',
      cautionFee: 'Caution Fee',
      agentFee: 'Agent Fee',
      agreementFee: 'Agreement Fee',
      legalFee: 'Legal Fee',
      serviceCharge: 'Service Charge',
      otherFee: (lease as any).otherFeeDescription || 'Other Fee',
    };

    const feeLabel = feeLabels[data.feeType];
    if (!feeLabel) {
      throw new AppError('Invalid fee type', 400);
    }

    const feeAmount = (lease as any)[data.feeType] || 0;
    if (feeAmount <= 0) {
      throw new AppError('This fee is not applicable to your lease', 400);
    }

    if (data.amount <= 0 || data.amount > feeAmount) {
      throw new AppError(`Payment amount must be between 1 and ${feeAmount}`, 400);
    }

    // Create PaymentGateway record
    const reference = `P360-FEE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    const paymentGateway = await PaymentGateway.create({
      reference,
      tenant: tenantId,
      landlord: lease.landlord,
      amount: data.amount,
      gateway: 'paystack',
      status: 'pending',
      metadata: {
        type: 'fee_payment',
        feeType: data.feeType,
        feeLabel,
        leaseId: lease._id.toString(),
      },
    });

    try {
      const paystackSecretKey = config.paystack?.secretKey || '';
      const response = await axios.post<any>(
        'https://api.paystack.co/transaction/initialize',
        {
          email: data.email,
          amount: Math.round(data.amount * 100),
          reference,
          callback_url: data.callbackUrl || config.paystack?.callbackUrl,
          metadata: {
            type: 'fee_payment',
            feeType: data.feeType,
            feeLabel,
            leaseId: lease._id.toString(),
            tenantId,
            paymentGatewayId: paymentGateway._id.toString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new AppError('Failed to initialize payment', 500);
      }

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      await PaymentGateway.findByIdAndUpdate(paymentGateway._id, {
        status: 'failed',
        gatewayResponse: error.response?.data || error.message,
      });
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to initialize payment', 500);
    }
  }

  // Helper methods
  private getMonthsDifference(start: Date, end: Date): number {
    const months = (end.getFullYear() - start.getFullYear()) * 12;
    return months + end.getMonth() - start.getMonth() + 1;
  }

  private calculateNextDueDate(leaseStart: Date, frequency: string): Date | null {
    const now = new Date();
    const start = new Date(leaseStart);
    let nextDue = new Date(start);

    while (nextDue <= now) {
      switch (frequency) {
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'quarterly':
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case 'annually':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }
    }

    return nextDue;
  }

  private getNextPaymentDate(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  private getPaymentPeriodStart(dueDate: Date, frequency: string): Date {
    const start = new Date(dueDate);
    switch (frequency) {
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'annually':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }
}

export default new TenantDashboardService();
