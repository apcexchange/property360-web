import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import TenancyAgreementService from '../services/TenancyAgreementService';
import { AuthRequest, ApiResponse } from '../types';
import { docuSealService } from '../services/DocuSealService';

export class TenancyAgreementController {
  /**
   * Upload a tenancy agreement for a lease
   */
  async uploadAgreement(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const agreement = await TenancyAgreementService.uploadAgreement({
        leaseId: req.params.leaseId as string,
        uploadedBy: req.user!._id.toString(),
        file: req.file,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Agreement uploaded successfully. Processing in progress.',
        data: agreement,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agreements for a specific lease
   */
  async getAgreementsByLease(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const agreements = await TenancyAgreementService.getAgreementsByLease(
        req.params.leaseId as string
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreements retrieved successfully',
        data: agreements,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get agreements for a property
   */
  async getAgreementsByProperty(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await TenancyAgreementService.getAgreementsByProperty(
        req.params.propertyId as string,
        req.user!._id.toString(),
        { page, limit }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreements retrieved successfully',
        data: result.agreements,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single agreement
   */
  async getAgreement(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const agreement = await TenancyAgreementService.getAgreement(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreement retrieved successfully',
        data: agreement,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an agreement
   */
  async deleteAgreement(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await TenancyAgreementService.deleteAgreement(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreement deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tenant acknowledges an agreement
   */
  async acknowledgeAgreement(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const agreement = await TenancyAgreementService.acknowledgeAgreement(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreement acknowledged successfully',
        data: agreement,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get processing status of an agreement
   */
  async getProcessingStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await TenancyAgreementService.getProcessingStatus(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Processing status retrieved successfully',
        data: status,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send agreement for e-signature (landlord only)
   */
  async sendForSigning(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const agreement = await TenancyAgreementService.sendForSigning(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Agreement sent for signing successfully',
        data: {
          id: agreement._id,
          signingStatus: agreement.signingStatus,
          tenantEmail: agreement.tenantEmail,
          tenantName: agreement.tenantName,
          sentAt: agreement.signingSentAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signing status of an agreement
   */
  async getSigningStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await TenancyAgreementService.getSigningStatus(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Signing status retrieved successfully',
        data: status,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend signing reminder to tenant (landlord only)
   */
  async resendSigningReminder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await TenancyAgreementService.resendSigningReminder(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Signing reminder sent successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signing link for tenant
   */
  async getSigningLink(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signingLink = await TenancyAgreementService.getSigningLinkForTenant(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Signing link retrieved successfully',
        data: { signingLink },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download agreement document (proxies the file from Cloudinary)
   */
  downloadDocument = async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const agreement = await TenancyAgreementService.getAgreement(
        req.params.id as string,
        req.user._id.toString()
      );

      if (!agreement.documentUrl) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      // Direct fetch - Cloudinary URLs are publicly accessible
      console.log('Fetching document from:', agreement.documentUrl);
      const response = await axios.get(agreement.documentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      console.log('Document fetched, size:', response.data.length);

      // Set appropriate headers
      const contentType = this.getContentType(agreement.documentType);
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${agreement.originalFilename}"`
      );
      res.setHeader('Content-Length', response.data.length);

      res.send(response.data);
    } catch (error: any) {
      console.error('Download document error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to download document',
      });
    }
  };

  /**
   * Download signed document (proxies the file)
   */
  downloadSignedDocument = async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const agreement = await TenancyAgreementService.getAgreement(
        req.params.id as string,
        req.user._id.toString()
      );

      if (!agreement.signedDocumentUrl) {
        res.status(404).json({
          success: false,
          message: 'Signed document not found',
        });
        return;
      }

      // Fetch the signed document
      const response = await axios.get(agreement.signedDocumentUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="signed_${agreement.originalFilename}"`
      );
      res.setHeader('Content-Length', response.data.length);

      res.send(response.data);
    } catch (error: any) {
      console.error('Download signed document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to download signed document',
      });
    }
  };

  /**
   * Get content type based on document type
   */
  private getContentType = (documentType: string): string => {
    switch (documentType) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'image':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  };

  /**
   * DocuSeal webhook handler (no auth required)
   */
  async handleWebhook(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const payload = docuSealService.parseWebhookPayload(req.body);

      await TenancyAgreementService.handleSigningWebhook(payload);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      // Always return 200 to DocuSeal to prevent retries
      res.status(200).json({ received: true, error: 'Processing failed' });
    }
  }
}

export default new TenancyAgreementController();
