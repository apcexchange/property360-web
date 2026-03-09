import { Response, NextFunction } from 'express';
import PaymentGatewayService from '../services/PaymentGatewayService';
import ReceiptService from '../services/ReceiptService';
import { AuthRequest, ApiResponse } from '../types';

export class TenantPaymentController {
  /**
   * Initiate a payment for an invoice
   * POST /tenant/payments/initiate
   */
  async initiatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const { invoiceId, amount, callbackUrl } = req.body;
      const email = req.user!.email;

      const result = await PaymentGatewayService.initiatePayment(tenantId, {
        invoiceId,
        amount,
        email,
        callbackUrl,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorizationUrl: result.authorizationUrl,
          reference: result.reference,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a payment
   * GET /tenant/payments/verify/:reference
   */
  async verifyPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;

      const payment = await PaymentGatewayService.verifyPayment(reference);

      const response: ApiResponse = {
        success: true,
        message: payment.status === 'success' ? 'Payment verified successfully' : 'Payment verification status',
        data: {
          status: payment.status,
          amount: payment.amount,
          reference: payment.reference,
          paidAt: payment.paidAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment by reference
   * GET /tenant/payments/reference/:reference
   */
  async getPaymentByReference(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reference } = req.params;

      const payment = await PaymentGatewayService.getPaymentByReference(reference);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Payment retrieved successfully',
        data: payment,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant's online payment history
   * GET /tenant/payments/online
   */
  async getOnlinePayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const { page, limit, status } = req.query;

      const result = await PaymentGatewayService.getTenantPayments(tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Online payments retrieved successfully',
        data: result.payments,
        meta: {
          total: result.total,
          totalPages: result.pages,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Paystack webhook
   * POST /webhooks/paystack
   */
  async handlePaystackWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;

      if (!signature) {
        res.status(400).json({
          success: false,
          message: 'Missing signature',
        });
        return;
      }

      await PaymentGatewayService.handleWebhook(signature, req.body);

      // Always return 200 for webhooks
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      // Still return 200 to prevent Paystack from retrying
      res.status(200).json({ received: true });
    }
  }
}

export default new TenantPaymentController();
