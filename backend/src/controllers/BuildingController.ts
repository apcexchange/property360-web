import { Response, NextFunction } from 'express';
import BuildingChatService from '../services/BuildingChatService';
import { AuthRequestBuilding, ApiResponse } from '../types';

class BuildingController {
  async getChat(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const chat = await BuildingChatService.getOrCreateChat((req.params.propertyId as string));
      const response: ApiResponse = {
        success: true,
        message: 'Building chat retrieved',
        data: chat,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async listMessages(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const result = await BuildingChatService.getMessages(
        (req.params.propertyId as string),
        page,
        limit
      );
      const response: ApiResponse = {
        success: true,
        message: 'Messages retrieved',
        data: result.messages,
        meta: { total: result.total, totalPages: result.pages, page, limit },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.buildingViewerRole !== 'member') {
        res.status(403).json({
          success: false,
          message: 'Only tenants can send messages in the building chat',
        });
        return;
      }
      const message = await BuildingChatService.sendMessage(
        (req.params.propertyId as string),
        req.user!._id.toString(),
        req.body
      );
      const response: ApiResponse = {
        success: true,
        message: 'Message sent',
        data: message,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markRead(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await BuildingChatService.markAsRead(
        (req.params.propertyId as string),
        req.user!._id.toString()
      );
      res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async listNeighbors(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const members = await BuildingChatService.getMembers((req.params.propertyId as string));
      const response: ApiResponse = {
        success: true,
        message: 'Neighbors retrieved',
        data: members,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPreview(
    req: AuthRequestBuilding,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const preview = await BuildingChatService.getPreview(
        (req.params.propertyId as string),
        req.user!._id.toString()
      );
      const response: ApiResponse = {
        success: true,
        message: 'Building preview retrieved',
        data: preview,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new BuildingController();
