import { Response, NextFunction } from 'express';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import ChatService from '../services/ChatService';
import { AuthRequest, ApiResponse } from '../types';

class ChatController {
  async getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await ChatService.getConversations(req.user!._id.toString());

      const response: ApiResponse = {
        success: true,
        message: 'Conversations retrieved',
        data: conversations,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await ChatService.getMessages(
        req.params.id as string,
        req.user!._id.toString(),
        page,
        limit
      );

      const response: ApiResponse = {
        success: true,
        message: 'Messages retrieved',
        data: result.messages,
        meta: {
          total: result.total,
          totalPages: result.pages,
          page: result.page,
          limit,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async startConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await ChatService.getOrCreateConversation(
        req.user!._id.toString(),
        req.body.unitId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Conversation started',
        data: conversation,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, messageType, attachment } = req.body;

      const message = await ChatService.sendMessage(
        req.params.id as string,
        req.user!._id.toString(),
        text || '',
        messageType || 'text',
        attachment
      );

      // Also emit via Socket.IO if available
      try {
        const { getIO } = require('../socket/socketServer');
        const io = getIO();
        if (io) {
          io.to(`conversation:${req.params.id}`).emit('chat:message', message);
        }
      } catch {
        // Socket.IO not initialized, REST-only mode
      }

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

  async uploadAttachment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file provided' });
        return;
      }

      const mimeType = req.file.mimetype;
      const isImage = mimeType.startsWith('image/');
      const isAudio = mimeType.startsWith('audio/');
      const folder = isImage ? 'chat/images' : isAudio ? 'chat/audio' : 'chat/files';

      // Use correct resource_type for Cloudinary
      const resourceType = isImage ? 'image' : isAudio ? 'video' : 'raw';

      const result: UploadApiResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: `property360/${folder}`,
        resource_type: resourceType,
      });

      const response: ApiResponse = {
        success: true,
        message: 'File uploaded',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          name: req.file.originalname,
          size: req.file.size,
          mimeType,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ChatService.markConversationAsRead(
        req.params.id as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Conversation marked as read',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await ChatService.getTotalUnreadCount(req.user!._id.toString());

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
}

export default new ChatController();
