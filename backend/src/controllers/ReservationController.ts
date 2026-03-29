import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import ReservationService from '../services/ReservationService';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware';
import { PaymentGateway } from '../models';
import { config } from '../config';

class ReservationController {
  /**
   * Create a reservation request (Tenant)
   * POST /reservations/request/:unitId
   */
  async createRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const unitId = req.params.unitId as string;
      const { message } = req.body;

      const request = await ReservationService.createRequest(tenantId, unitId, message);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation request submitted successfully',
        data: request,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant's reservation requests
   * GET /reservations/my-requests
   */
  async getTenantRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const requests = await ReservationService.getTenantRequests(tenantId);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation requests retrieved',
        data: requests,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord's reservation requests
   * GET /reservations/landlord-requests
   */
  async getLandlordRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.user!._id.toString();
      const status = req.query.status as string | undefined;
      const requests = await ReservationService.getLandlordRequests(landlordId, status);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation requests retrieved',
        data: requests,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a reservation request (Landlord/Agent)
   * POST /reservations/:id/approve
   */
  async approveRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.user!._id.toString();
      const requestId = req.params.id as string;

      const request = await ReservationService.approveRequest(requestId, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation request approved',
        data: request,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Decline a reservation request (Landlord/Agent)
   * POST /reservations/:id/decline
   */
  async declineRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.user!._id.toString();
      const requestId = req.params.id as string;
      const { reason } = req.body;

      const request = await ReservationService.declineRequest(requestId, landlordId, reason);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation request declined',
        data: request,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate payment for an approved reservation (Tenant)
   * POST /reservations/:id/pay
   */
  async initiatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const requestId = req.params.id as string;
      const email = req.user!.email;
      const { paymentType } = req.body;

      const result = await ReservationService.initiatePayment(
        requestId,
        tenantId,
        paymentType,
        email
      );

      const response: ApiResponse = {
        success: true,
        message: 'Reservation payment initialized',
        data: result,
      };

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof AppError) return next(error);
      console.error('Reservation payment error:', error.response?.data || error.message);
      next(new AppError('Failed to initialize reservation payment', 500));
    }
  }

  /**
   * Mark reservation as paid via bank transfer (Tenant)
   * POST /reservations/:id/bank-transfer
   */
  async markPaidByTransfer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const requestId = req.params.id as string;

      const request = await ReservationService.markPaidByTransfer(requestId, tenantId);

      const response: ApiResponse = {
        success: true,
        message: 'Payment recorded. Awaiting landlord confirmation.',
        data: request,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a pending reservation request (Tenant)
   * POST /reservations/:id/cancel
   */
  async cancelRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const requestId = req.params.id as string;

      const request = await ReservationService.cancelRequest(requestId, tenantId);

      const response: ApiResponse = {
        success: true,
        message: 'Reservation request cancelled',
        data: request,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle reservation webhook from Paystack
   */
  async handleReservationWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      if (!signature) {
        res.status(400).json({ success: false, message: 'Missing signature' });
        return;
      }

      const hash = crypto
        .createHmac('sha512', config.paystack?.webhookSecret || config.paystack?.secretKey || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== signature) {
        res.status(400).json({ success: false, message: 'Invalid signature' });
        return;
      }

      const event = req.body;
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const paymentGateway = await PaymentGateway.findOne({ reference });

        if (
          paymentGateway &&
          paymentGateway.metadata?.type === 'reservation' &&
          paymentGateway.metadata?.requestId
        ) {
          paymentGateway.status = 'success';
          paymentGateway.paidAt = new Date(event.data.paid_at);
          paymentGateway.gatewayResponse = event.data;
          await paymentGateway.save();

          const requestId = paymentGateway.metadata.requestId as string;
          await ReservationService.completePayment(requestId, reference);
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Reservation webhook error:', error);
      res.status(200).json({ received: true });
    }
  }
}

export default new ReservationController();
