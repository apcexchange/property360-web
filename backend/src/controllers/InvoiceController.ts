import { Response, NextFunction } from 'express';
import { InvoiceService } from '../services';
import { PdfService, PopulatedInvoice } from '../services/PdfService';
import EmailOtpService from '../services/EmailOtpService';
import { AuthRequestWithLandlord, ApiResponse, InvoiceStatus } from '../types';

export class InvoiceController {
  /**
   * Create a new invoice
   * POST /invoices
   */
  async createInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.createInvoice(landlordId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all invoices with optional filters
   * GET /invoices
   */
  async getInvoices(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const { status, tenantId, propertyId, page, limit } = req.query;

      const result = await InvoiceService.getInvoices(landlordId, {
        status: status as InvoiceStatus,
        tenantId: tenantId as string,
        propertyId: propertyId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Invoices retrieved successfully',
        data: result.invoices,
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
   * Get invoice statistics
   * GET /invoices/stats
   */
  async getInvoiceStats(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const stats = await InvoiceService.getInvoiceStats(landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice statistics retrieved successfully',
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single invoice
   * GET /invoices/:invoiceId
   */
  async getInvoiceById(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.getInvoiceById(req.params.invoiceId as string, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice retrieved successfully',
        data: invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a draft invoice
   * PUT /invoices/:invoiceId
   */
  async updateInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.updateInvoice(
        req.params.invoiceId as string,
        landlordId,
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invoice updated successfully',
        data: invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a draft invoice
   * POST /invoices/:invoiceId/send
   */
  async sendInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.sendInvoice(req.params.invoiceId as string, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice sent successfully',
        data: invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark invoice as paid
   * POST /invoices/:invoiceId/paid
   */
  async markAsPaid(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.markAsPaid(
        req.params.invoiceId as string,
        landlordId,
        req.body.transactionId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invoice marked as paid',
        data: invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an invoice
   * POST /invoices/:invoiceId/cancel
   */
  async cancelInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      const invoice = await InvoiceService.cancelInvoice(req.params.invoiceId as string, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice cancelled',
        data: invoice,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a draft invoice
   * DELETE /invoices/:invoiceId
   */
  async deleteInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      await InvoiceService.deleteInvoice(req.params.invoiceId as string, landlordId);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice deleted',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Email invoice PDF to tenant
   * POST /invoices/:invoiceId/email
   */
  async emailInvoice(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const landlordId = req.landlordId?.toString() || req.user!._id.toString();

      // Get the fully populated invoice
      const invoiceDoc = await InvoiceService.getInvoiceById(req.params.invoiceId as string, landlordId);

      if (!invoiceDoc) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      // Cast to plain object with populated fields
      const invoice = invoiceDoc.toObject() as unknown as PopulatedInvoice;

      // Generate PDF
      const pdfBuffer = await PdfService.generateInvoicePdf(invoice);

      // Send email with PDF attachment
      await EmailOtpService.sendInvoiceEmail(
        invoice.tenant.email,
        invoice.tenant.firstName,
        invoice.invoiceNumber,
        invoice.property.name,
        invoice.unit?.unitNumber,
        invoice.total,
        invoice.dueDate,
        pdfBuffer
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invoice emailed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();
