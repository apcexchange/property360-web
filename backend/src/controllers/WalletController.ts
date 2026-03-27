import { Response, NextFunction } from 'express';
import WalletService from '../services/WalletService';
import { AuthRequest, ApiResponse, WalletTransactionType } from '../types';

class WalletController {
  /**
   * Get wallet (creates if not exists)
   * GET /wallet
   */
  async getWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const wallet = await WalletService.getOrCreateWallet(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Wallet retrieved successfully',
        data: wallet,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet statistics
   * GET /wallet/stats
   */
  async getWalletStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const stats = await WalletService.getWalletStats(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Wallet stats retrieved successfully',
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet transactions
   * GET /wallet/transactions
   */
  async getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { page, limit, type } = req.query;

      const result = await WalletService.getWalletTransactions(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        type: type as WalletTransactionType,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: result.transactions,
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
   * Update wallet settings
   * PATCH /wallet/settings
   */
  async updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { autoSettlement, autoPayoutEnabled, autoPayoutThreshold, defaultBankAccount } = req.body;

      const wallet = await WalletService.updateWalletSettings(userId, {
        autoSettlement,
        autoPayoutEnabled,
        autoPayoutThreshold,
        defaultBankAccount,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Wallet settings updated successfully',
        data: wallet,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new WalletController();
