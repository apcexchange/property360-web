import { Response, NextFunction } from 'express';
import SharedBillService from '../services/SharedBillService';
import { AuthRequestBuilding, AuthRequest, ApiResponse } from '../types';

class SharedBillController {
  async listForProperty(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = req.query.status as 'open' | 'settled' | 'cancelled' | undefined;
      const bills = await SharedBillService.listBillsForProperty(
        (req.params.propertyId as string),
        status
      );
      res.status(200).json({
        success: true,
        message: 'Bills retrieved',
        data: bills,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async listMine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as
        | 'unpaid'
        | 'pending_confirmation'
        | 'paid'
        | 'disputed'
        | undefined;
      const shares = await SharedBillService.listMySharesAcrossProperties(
        req.user!._id.toString(),
        status
      );
      res.status(200).json({
        success: true,
        message: 'My shares retrieved',
        data: shares,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async create(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.buildingViewerRole !== 'member') {
        res.status(403).json({
          success: false,
          message: 'Only tenants can create shared bills',
        });
        return;
      }
      const detail = await SharedBillService.createBill(
        req.user!._id.toString(),
        (req.params.propertyId as string),
        req.body
      );
      res.status(201).json({
        success: true,
        message: 'Bill created',
        data: detail,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await SharedBillService.getBillDetail(
        (req.params.billId as string),
        req.user!._id.toString()
      );
      res.status(200).json({
        success: true,
        message: 'Bill detail retrieved',
        data: detail,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async markPaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const share = await SharedBillService.markShareAsPaid(
        (req.params.shareId as string),
        req.user!._id.toString(),
        req.body?.note
      );
      res.status(200).json({
        success: true,
        message: 'Share marked as paid',
        data: share,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const share = await SharedBillService.confirmSharePayment(
        (req.params.billId as string),
        (req.params.shareId as string),
        req.user!._id.toString()
      );
      res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        data: share,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async dispute(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = (req.body?.reason as string) || '';
      if (!reason.trim()) {
        res.status(400).json({ success: false, message: 'Reason is required' });
        return;
      }
      const share = await SharedBillService.disputeShare(
        (req.params.billId as string),
        (req.params.shareId as string),
        req.user!._id.toString(),
        reason
      );
      res.status(200).json({
        success: true,
        message: 'Share disputed',
        data: share,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bill = await SharedBillService.cancelBill(
        (req.params.billId as string),
        req.user!._id.toString()
      );
      res.status(200).json({
        success: true,
        message: 'Bill cancelled',
        data: bill,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export default new SharedBillController();
