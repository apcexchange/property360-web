import { Response, NextFunction } from 'express';
import { PaymentService } from '../services';
import { AuthRequest, ApiResponse } from '../types';

export class PaymentController {
  /**
   * Record a payment for a lease
   * POST /tenants/lease/:leaseId/payments
   */
  async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaseId = req.params.leaseId as string;
      const landlordId = req.user!._id.toString();

      const payment = await PaymentService.recordPayment(leaseId, landlordId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Payment recorded successfully',
        data: payment,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history for a lease
   * GET /tenants/lease/:leaseId/payments
   */
  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaseId = req.params.leaseId as string;
      const landlordId = req.user!._id.toString();

      const payments = await PaymentService.getPaymentHistory(leaseId, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Payment history retrieved successfully',
        data: payments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lease balance summary
   * GET /tenants/lease/:leaseId/balance
   */
  async getLeaseBalance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaseId = req.params.leaseId as string;
      const landlordId = req.user!._id.toString();

      const balance = await PaymentService.getLeaseBalance(leaseId, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Lease balance retrieved successfully',
        data: balance,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Void a payment
   * DELETE /tenants/lease/:leaseId/payments/:paymentId
   */
  async voidPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaseId = req.params.leaseId as string;
      const paymentId = req.params.paymentId as string;
      const landlordId = req.user!._id.toString();
      const { reason } = req.body;

      const payment = await PaymentService.voidPayment(leaseId, paymentId, landlordId, reason);

      const response: ApiResponse = {
        success: true,
        message: 'Payment voided successfully',
        data: payment,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
