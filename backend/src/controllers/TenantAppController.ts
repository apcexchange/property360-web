import { Response, NextFunction } from 'express';
import TenantDashboardService from '../services/TenantDashboardService';
import { AuthRequest, ApiResponse } from '../types';

export class TenantAppController {
  /**
   * Get tenant dashboard data (lease info, property, landlord)
   */
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaseInfo = await TenantDashboardService.getTenantLeaseInfo(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: leaseInfo ? 'Dashboard data retrieved' : 'No active lease found',
        data: leaseInfo,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment summary for tenant
   */
  async getPaymentSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await TenantDashboardService.getPaymentSummary(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Payment summary retrieved',
        data: summary,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, limit, offset } = req.query;

      const result = await TenantDashboardService.getPaymentHistory(
        req.user!._id.toString(),
        {
          status: status as string,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Payment history retrieved',
        data: result.payments,
        meta: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 20,
          page: offset ? Math.floor(parseInt(offset as string) / (parseInt(limit as string) || 20)) + 1 : 1,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upcoming payments for tenant
   */
  async getUpcomingPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await TenantDashboardService.getUpcomingPayments(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming payments retrieved',
        data: payments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get maintenance requests for tenant
   */
  async getMaintenanceRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, limit, offset } = req.query;

      const result = await TenantDashboardService.getMaintenanceRequests(
        req.user!._id.toString(),
        {
          status: status as string,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Maintenance requests retrieved',
        data: result.requests,
        meta: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 20,
          page: offset ? Math.floor(parseInt(offset as string) / (parseInt(limit as string) || 20)) + 1 : 1,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a maintenance request
   */
  async createMaintenanceRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await TenantDashboardService.createMaintenanceRequest(
        req.user!._id.toString(),
        {
          title: req.body.title,
          description: req.body.description,
          priority: req.body.priority,
          images: req.body.images,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Maintenance request created',
        data: {
          id: request._id.toString(),
          title: request.title,
          description: request.description,
          priority: request.priority,
          status: request.status,
          createdAt: request.createdAt,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single maintenance request
   */
  async getMaintenanceRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.requestId as string;
      const request = await TenantDashboardService.getMaintenanceRequestById(
        requestId,
        req.user!._id.toString()
      );

      if (!request) {
        const response: ApiResponse = {
          success: false,
          message: 'Maintenance request not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Maintenance request retrieved',
        data: request,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a maintenance request
   */
  async cancelMaintenanceRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.requestId as string;
      const request = await TenantDashboardService.cancelMaintenanceRequest(
        requestId,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Maintenance request cancelled',
        data: {
          id: request._id.toString(),
          status: request.status,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ============ Lease Invitations ============

  async getPendingInvitations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await TenantDashboardService.getPendingInvitations(
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Pending invitations retrieved',
        data: invitations,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getInvitationDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const details = await TenantDashboardService.getInvitationDetails(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Invitation details retrieved',
        data: details,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async acceptInvitation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.acceptInvitation(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async declineInvitation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.declineInvitation(
        req.params.leaseId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ============ Fee Payments ============

  async markRentPaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.markRentPaid(
        req.user!._id.toString(),
        {
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod,
          notes: req.body.notes,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Rent payment recorded successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markFeePaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.markFeePaid(
        req.user!._id.toString(),
        {
          feeType: req.body.feeType,
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod,
          notes: req.body.notes,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Fee payment recorded successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markAllFeesPaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.markAllFeesPaid(
        req.user!._id.toString(),
        req.body.paymentMethod || 'cash'
      );

      const response: ApiResponse = {
        success: true,
        message: 'All outstanding fees marked as paid',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async initiateAllFeesPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.initiateAllFeesPayment(
        req.user!._id.toString(),
        { email: req.user!.email, callbackUrl: req.body.callbackUrl }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Payment initialized for all outstanding fees',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async initiateFeePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TenantDashboardService.initiateFeePayment(
        req.user!._id.toString(),
        {
          feeType: req.body.feeType,
          amount: req.body.amount,
          email: req.user!.email,
          callbackUrl: req.body.callbackUrl,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Fee payment initialized',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant receipts
   */
  async getReceipts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, page } = req.query;

      const result = await TenantDashboardService.getTenantReceipts(
        req.user!._id.toString(),
        {
          limit: limit ? parseInt(limit as string) : undefined,
          page: page ? parseInt(page as string) : undefined,
        }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Receipts retrieved',
        data: result.receipts,
        meta: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 20,
          page: page ? parseInt(page as string) : 1,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single receipt
   */
  async getReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const receiptId = req.params.receiptId as string;
      const receipt = await TenantDashboardService.getTenantReceipt(
        receiptId,
        req.user!._id.toString()
      );

      if (!receipt) {
        const response: ApiResponse = {
          success: false,
          message: 'Receipt not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Receipt retrieved',
        data: receipt,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new TenantAppController();
