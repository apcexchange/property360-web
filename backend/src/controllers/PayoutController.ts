import { Request, Response, NextFunction } from 'express';
import PayoutService from '../services/PayoutService';
import PaystackTransferService from '../services/PaystackTransferService';
import { AuthRequest, ApiResponse, PayoutStatus } from '../types';

class PayoutController {
  /**
   * Request a payout
   * POST /payouts
   */
  async requestPayout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { amount, bankAccountId } = req.body;

      const payout = await PayoutService.requestPayout(userId, {
        amount,
        bankAccountId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Payout requested successfully',
        data: payout,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payout history
   * GET /payouts
   */
  async getPayoutHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { page, limit, status } = req.query;

      const result = await PayoutService.getPayoutHistory(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as PayoutStatus,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Payout history retrieved successfully',
        data: result.payouts,
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
   * Get payout details
   * GET /payouts/:id
   */
  async getPayoutDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const payoutId = req.params.id as string;

      const payout = await PayoutService.getPayoutById(payoutId, userId);

      if (!payout) {
        res.status(404).json({
          success: false,
          message: 'Payout not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Payout details retrieved successfully',
        data: payout,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry a failed payout
   * POST /payouts/:id/retry
   */
  async retryPayout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const payoutId = req.params.id as string;

      const payout = await PayoutService.retryPayout(payoutId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Payout retry initiated successfully',
        data: payout,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Paystack transfer webhook
   * POST /webhooks/paystack/transfer
   */
  async handleTransferWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Verify webhook signature
      if (!PaystackTransferService.verifyWebhookSignature(signature, payload)) {
        res.status(400).json({
          success: false,
          message: 'Invalid webhook signature',
        });
        return;
      }

      const { event, data } = req.body;

      // Process transfer events
      if (event.startsWith('transfer.')) {
        await PayoutService.handleTransferWebhook(event, data);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Transfer webhook error:', error);
      // Always return 200 to Paystack to prevent retries
      res.status(200).json({ success: true });
    }
  }
}

export default new PayoutController();
