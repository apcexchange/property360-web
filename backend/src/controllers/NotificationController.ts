import { Response, NextFunction } from 'express';
import NotificationService from '../services/NotificationService';
import { AuthRequest, ApiResponse } from '../types';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await NotificationService.getNotifications(
        req.user!._id.toString(),
        page,
        limit
      );

      const response: ApiResponse = {
        success: true,
        message: 'Notifications retrieved',
        data: result.notifications,
        meta: {
          total: result.total,
          totalPages: result.pages,
          page,
          limit,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await NotificationService.getUnreadCount(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Unread count retrieved',
        data: { count },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await NotificationService.markAsRead(
        req.params.id as string,
        req.user!._id.toString()
      );

      if (!notification) {
        const response: ApiResponse = {
          success: false,
          message: 'Notification not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
        data: notification,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'All notifications marked as read',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
