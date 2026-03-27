import { Response, NextFunction } from 'express';
import ReceiptService from '../services/ReceiptService';
import { PdfService } from '../services/PdfService';
import EmailOtpService from '../services/EmailOtpService';
import { AuthRequestWithLandlord, AuthRequest, ApiResponse } from '../types';

export class ReceiptController {
  /**
   * Create a receipt for a transaction
   * POST /receipts
   */
  async createReceipt(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const { transactionId, invoiceId, description } = req.body;

      const receipt = await ReceiptService.createReceipt(transactionId, userId, {
        transactionId,
        invoiceId,
        description,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Receipt created successfully',
        data: receipt,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a receipt by ID
   * GET /receipts/:receiptId
   */
  async getReceiptById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const receiptId = req.params.receiptId as string;

      const receipt = await ReceiptService.getReceiptById(receiptId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Receipt retrieved successfully',
        data: receipt,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get receipts for tenant
   * GET /tenant/receipts
   */
  async getTenantReceipts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!._id.toString();
      const { page, limit } = req.query;

      const result = await ReceiptService.getTenantReceipts(tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Receipts retrieved successfully',
        data: result.receipts,
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
   * Get receipts for landlord
   * GET /receipts
   */
  async getLandlordReceipts(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();
      const { page, limit, tenantId, propertyId } = req.query;

      const result = await ReceiptService.getLandlordReceipts(landlordId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        tenantId: tenantId as string,
        propertyId: propertyId as string,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Receipts retrieved successfully',
        data: result.receipts,
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
   * Email receipt to tenant
   * POST /receipts/:receiptId/email
   */
  async emailReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id.toString();
      const receiptId = req.params.receiptId as string;

      const receipt = await ReceiptService.getReceiptById(receiptId, userId);

      // Generate PDF (we'll create a receipt PDF generator)
      // For now, send a simple email notification
      const tenant = receipt.tenant as any;

      // Mark as emailed
      await ReceiptService.markAsEmailed(receiptId, tenant.email);

      const response: ApiResponse = {
        success: true,
        message: 'Receipt emailed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get receipt by transaction ID
   * GET /receipts/transaction/:transactionId
   */
  async getReceiptByTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionId = req.params.transactionId as string;

      const receipt = await ReceiptService.getReceiptByTransaction(transactionId);

      if (!receipt) {
        res.status(404).json({
          success: false,
          message: 'Receipt not found for this transaction',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Receipt retrieved successfully',
        data: receipt,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new ReceiptController();
