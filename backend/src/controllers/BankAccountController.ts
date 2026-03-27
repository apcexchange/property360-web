import { Response, NextFunction } from 'express';
import BankAccountService from '../services/BankAccountService';
import { AuthRequest, ApiResponse } from '../types';

class BankAccountController {
  /**
   * List all Nigerian banks
   * GET /bank-accounts/banks
   */
  async listBanks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const banks = await BankAccountService.listBanks();

      const response: ApiResponse = {
        success: true,
        message: 'Banks retrieved successfully',
        data: banks,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a bank account number
   * POST /bank-accounts/verify
   */
  async verifyAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountNumber, bankCode } = req.body;

      const result = await BankAccountService.verifyAccountNumber(accountNumber, bankCode);

      const response: ApiResponse = {
        success: true,
        message: 'Account verified successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a bank account
   * POST /bank-accounts
   */
  async addBankAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { bankCode, accountNumber } = req.body;

      const bankAccount = await BankAccountService.addBankAccount(userId, {
        bankCode,
        accountNumber,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Bank account added successfully',
        data: bankAccount,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bank accounts for the user
   * GET /bank-accounts
   */
  async getBankAccounts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();

      const bankAccounts = await BankAccountService.getBankAccounts(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Bank accounts retrieved successfully',
        data: bankAccounts,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set a bank account as primary
   * PATCH /bank-accounts/:id/primary
   */
  async setPrimaryAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const bankAccountId = req.params.id as string;

      const bankAccount = await BankAccountService.setPrimaryAccount(userId, bankAccountId);

      const response: ApiResponse = {
        success: true,
        message: 'Primary bank account updated successfully',
        data: bankAccount,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a bank account
   * DELETE /bank-accounts/:id
   */
  async deleteBankAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const bankAccountId = req.params.id as string;

      await BankAccountService.deleteBankAccount(userId, bankAccountId);

      const response: ApiResponse = {
        success: true,
        message: 'Bank account deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new BankAccountController();
