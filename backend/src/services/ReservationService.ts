import axios from 'axios';
import crypto from 'crypto';
import { Unit, Property, User, ReservationRequest, PaymentGateway, BankAccount } from '../models';
import { AppError } from '../middleware';
import NotificationService from './NotificationService';
import { config } from '../config';

class ReservationService {
  /**
   * Create a reservation request (Tenant)
   */
  async createRequest(tenantId: string, unitId: string, message?: string) {
    const unit = await Unit.findById(unitId);
    if (!unit) throw new AppError('Unit not found', 404);

    if (!unit.isListed || unit.listingStatus !== 'active') {
      throw new AppError('This unit is not available for reservation', 400);
    }

    const property = await Property.findById(unit.property);
    if (!property || !property.isActive) {
      throw new AppError('Property not found or inactive', 404);
    }

    // Check for existing pending/approved request from same tenant for this unit
    const existingRequest = await ReservationRequest.findOne({
      tenant: tenantId,
      unit: unitId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRequest) {
      throw new AppError('You already have an active reservation request for this unit', 400);
    }

    const request = await ReservationRequest.create({
      tenant: tenantId,
      unit: unitId,
      property: property._id,
      landlord: property.owner,
      status: 'pending',
      message,
      reservationDays: unit.reservationDays || 7,
    });

    // Notify landlord
    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'A tenant';

    NotificationService.createNotification(
      property.owner.toString(),
      'New Reservation Request',
      `${tenantName} has requested to reserve Unit ${unit.unitNumber} at ${property.name}.`,
      'marketplace',
      { requestId: request._id.toString(), unitId, tenantId }
    ).catch(err => console.error('[ReservationService] Failed to notify landlord:', err));

    return request;
  }

  /**
   * Get reservation requests for a landlord
   */
  async getLandlordRequests(landlordId: string, status?: string) {
    const filter: Record<string, unknown> = { landlord: landlordId };
    if (status) filter.status = status;

    const requests = await ReservationRequest.find(filter)
      .populate('tenant', 'firstName lastName avatar email phone')
      .populate('unit', 'unitNumber rentAmount')
      .populate('property', 'name images')
      .sort({ createdAt: -1 });

    return requests;
  }

  /**
   * Get reservation requests for a tenant
   */
  async getTenantRequests(tenantId: string) {
    const requests = await ReservationRequest.find({ tenant: tenantId })
      .populate('unit', 'unitNumber rentAmount inspectionFee inspectionFeeEnabled defaultFees')
      .populate('property', 'name images address')
      .populate('landlord', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    // Attach landlord's primary bank account to each request
    const results = [];
    for (const req of requests) {
      const reqObj = req.toJSON();
      const bankAccount = await BankAccount.findOne({
        landlord: req.landlord._id || req.landlord,
        isPrimary: true,
        isActive: true,
      }).select('bankName accountNumber accountName');

      (reqObj as any).landlordBankAccount = bankAccount
        ? { bankName: bankAccount.bankName, accountNumber: bankAccount.accountNumber, accountName: bankAccount.accountName }
        : null;

      results.push(reqObj);
    }

    return results;
  }

  /**
   * Approve a reservation request (Landlord/Agent)
   */
  async approveRequest(requestId: string, landlordId: string) {
    const request = await ReservationRequest.findOne({
      _id: requestId,
      landlord: landlordId,
      status: 'pending',
    });

    if (!request) {
      throw new AppError('Reservation request not found or already processed', 404);
    }

    request.status = 'approved';
    request.approvedAt = new Date();
    await request.save();

    // Notify tenant
    NotificationService.createNotification(
      request.tenant.toString(),
      'Reservation Request Approved',
      'Your reservation request has been approved! You can now proceed to payment.',
      'marketplace',
      { requestId: request._id.toString(), unitId: request.unit.toString() }
    ).catch(err => console.error('[ReservationService] Failed to notify tenant:', err));

    return request;
  }

  /**
   * Decline a reservation request (Landlord/Agent)
   */
  async declineRequest(requestId: string, landlordId: string, reason?: string) {
    const request = await ReservationRequest.findOne({
      _id: requestId,
      landlord: landlordId,
      status: 'pending',
    });

    if (!request) {
      throw new AppError('Reservation request not found or already processed', 404);
    }

    request.status = 'declined';
    request.declineReason = reason;
    await request.save();

    // Notify tenant
    const declineMessage = reason
      ? `Your reservation request has been declined. Reason: ${reason}`
      : 'Your reservation request has been declined.';

    NotificationService.createNotification(
      request.tenant.toString(),
      'Reservation Request Declined',
      declineMessage,
      'marketplace',
      { requestId: request._id.toString(), unitId: request.unit.toString() }
    ).catch(err => console.error('[ReservationService] Failed to notify tenant:', err));

    return request;
  }

  /**
   * Initiate payment for an approved reservation request (Tenant)
   */
  async initiatePayment(
    requestId: string,
    tenantId: string,
    paymentType: 'inspection' | 'full',
    email: string
  ) {
    const request = await ReservationRequest.findOne({
      _id: requestId,
      tenant: tenantId,
      status: 'approved',
    }).populate('unit');

    if (!request) {
      throw new AppError('Approved reservation request not found', 404);
    }

    const unit = await Unit.findById(request.unit);
    if (!unit) throw new AppError('Unit not found', 404);

    // Calculate amount based on payment type
    let amount: number;
    if (paymentType === 'inspection') {
      amount = unit.inspectionFee || 0;
      if (amount <= 0) {
        throw new AppError('Inspection fee is not set for this unit', 400);
      }
    } else {
      // Full payment: rent + all default fees
      amount = unit.rentAmount;
      if (unit.defaultFees) {
        amount += unit.defaultFees.securityDeposit || 0;
        amount += unit.defaultFees.cautionFee || 0;
        amount += unit.defaultFees.agentFee || 0;
        amount += unit.defaultFees.agreementFee || 0;
        amount += unit.defaultFees.legalFee || 0;
        amount += unit.defaultFees.serviceCharge || 0;
        amount += unit.defaultFees.otherFee || 0;
      }
    }

    const reference = `P360-RES-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    // Create PaymentGateway record
    const paymentGateway = await PaymentGateway.create({
      reference,
      tenant: tenantId,
      landlord: request.landlord,
      amount,
      gateway: 'paystack',
      status: 'pending',
      metadata: {
        type: 'reservation',
        requestId: request._id.toString(),
      },
    });

    // Call Paystack API
    const paystackSecretKey = config.paystack?.secretKey || '';
    const paystackResponse = await axios.post<any>(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference,
        callback_url: config.paystack?.callbackUrl,
        metadata: {
          type: 'reservation',
          requestId: request._id.toString(),
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

    if (!paystackResponse.data.status) {
      throw new AppError('Failed to initialize payment', 500);
    }

    // Update request with payment type
    request.paymentType = paymentType;
    request.paymentAmount = amount;
    await request.save();

    return {
      authorizationUrl: paystackResponse.data.data.authorization_url,
      reference: paystackResponse.data.data.reference,
      amount,
    };
  }

  /**
   * Complete payment after successful Paystack charge
   */
  async completePayment(requestId: string, paymentRef: string) {
    const request = await ReservationRequest.findById(requestId);
    if (!request) {
      throw new AppError('Reservation request not found', 404);
    }

    const unit = await Unit.findById(request.unit);
    if (!unit) throw new AppError('Unit not found', 404);

    // Update request
    request.status = 'paid';
    request.paidAt = new Date();
    request.paymentRef = paymentRef;

    const reservationDays = request.reservationDays || 7;
    const expiresAt = new Date(Date.now() + reservationDays * 24 * 60 * 60 * 1000);
    request.expiresAt = expiresAt;
    await request.save();

    // Update unit
    unit.listingStatus = 'reserved';
    unit.reservedBy = request.tenant;
    unit.reservedAt = new Date();
    unit.reservationExpiresAt = expiresAt;
    unit.reservationPaymentRef = paymentRef;
    await unit.save();

    // Notify landlord
    const tenant = await User.findById(request.tenant).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'A tenant';
    const property = await Property.findById(request.property).select('name');

    NotificationService.createNotification(
      request.landlord.toString(),
      'Reservation Payment Completed',
      `${tenantName} has completed payment for Unit ${unit.unitNumber}${property ? ` at ${property.name}` : ''}. The unit is now reserved.`,
      'marketplace',
      {
        requestId: request._id.toString(),
        unitId: unit._id.toString(),
        tenantId: request.tenant.toString(),
        paymentRef,
      }
    ).catch(err => console.error('[ReservationService] Failed to notify landlord:', err));

    return request;
  }

  /**
   * Cancel a pending reservation request (Tenant)
   */
  async cancelRequest(requestId: string, tenantId: string) {
    const request = await ReservationRequest.findOne({
      _id: requestId,
      tenant: tenantId,
      status: 'pending',
    });

    if (!request) {
      throw new AppError('Pending reservation request not found', 404);
    }

    request.status = 'cancelled';
    await request.save();

    return request;
  }

  /**
   * Mark reservation as paid via bank transfer (pending landlord confirmation)
   */
  async markPaidByTransfer(requestId: string, tenantId: string) {
    const request = await ReservationRequest.findOne({
      _id: requestId,
      tenant: tenantId,
      status: 'approved',
    }).populate('unit');

    if (!request) {
      throw new AppError('Approved reservation request not found', 404);
    }

    const unit = await Unit.findById(request.unit);
    if (!unit) throw new AppError('Unit not found', 404);

    // Calculate full amount
    let amount = unit.rentAmount;
    if (unit.defaultFees) {
      amount += (unit.defaultFees.securityDeposit || 0) + (unit.defaultFees.cautionFee || 0)
        + (unit.defaultFees.agentFee || 0) + (unit.defaultFees.agreementFee || 0)
        + (unit.defaultFees.legalFee || 0) + (unit.defaultFees.serviceCharge || 0)
        + (unit.defaultFees.otherFee || 0);
    }

    request.status = 'paid';
    request.paidAt = new Date();
    request.paymentType = 'full';
    request.paymentAmount = amount;
    request.paymentRef = `TRANSFER-${Date.now().toString(36)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (request.reservationDays || 7));
    request.expiresAt = expiresAt;
    await request.save();

    // Update unit
    unit.listingStatus = 'reserved';
    unit.reservedBy = tenantId as any;
    unit.reservedAt = new Date();
    unit.reservationExpiresAt = expiresAt;
    unit.reservationPaymentRef = request.paymentRef;
    await unit.save();

    // Notify landlord to confirm transfer
    const tenant = await User.findById(tenantId).select('firstName lastName');
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
    const property = await Property.findById(request.property).select('name');

    NotificationService.createNotification(
      request.landlord.toString(),
      'Bank Transfer Payment — Confirm',
      `${tenantName} says they paid via bank transfer for Unit ${unit.unitNumber} at ${property?.name || 'property'}. Please confirm receipt.`,
      'marketplace',
      { requestId: request._id.toString(), action: 'confirm_transfer' }
    ).catch(err => console.error('[ReservationService] Failed to notify landlord:', err));

    return request;
  }
}

export default new ReservationService();
