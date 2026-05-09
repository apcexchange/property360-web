import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models';
import ChatService from '../services/ChatService';
import BuildingChatService from '../services/BuildingChatService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();

let io: Server;

export function getIO(): Server {
  return io;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as { id: string; role: string };
      const user = await User.findById(decoded.id).select('_id role firstName lastName');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`[Socket] User connected: ${userId} (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Personal room for targeted pushes (notification:new, bill:share-updated
    // for the specific tenant, etc.). Always joined post-auth so services can
    // emit reliably to a known room name regardless of which screen is open.
    socket.join(`user:${userId}`);

    // Broadcast online status
    socket.broadcast.emit('user:online', { userId });

    // ============ Building Chat Events ============
    // The membership check on `building:join` is REQUIRED — without it any
    // authenticated socket could silently subscribe to any building's chat.

    socket.on('building:join', async (data: { propertyId: string }) => {
      try {
        await BuildingChatService.assertMembership(userId, data.propertyId);
        socket.join(`building:${data.propertyId}`);
      } catch {
        socket.emit('building:error', {
          code: 'forbidden',
          message: 'Not a member of this building',
        });
      }
    });

    socket.on('building:leave', (data: { propertyId: string }) => {
      socket.leave(`building:${data.propertyId}`);
    });

    socket.on(
      'building:message',
      async (data: { propertyId: string; text: string; messageType?: string }) => {
        try {
          await BuildingChatService.assertMembership(userId, data.propertyId);
          const message = await BuildingChatService.sendMessage(
            data.propertyId,
            userId,
            { text: data.text, messageType: data.messageType as any }
          );
          io.to(`building:${data.propertyId}`).emit('building:message', message);
        } catch {
          socket.emit('building:error', {
            code: 'send_failed',
            message: 'Failed to send building message',
          });
        }
      }
    );

    socket.on('building:typing', (data: { propertyId: string }) => {
      socket.to(`building:${data.propertyId}`).emit('building:typing', {
        userId,
        propertyId: data.propertyId,
      });
    });

    socket.on('building:read', async (data: { propertyId: string }) => {
      try {
        await BuildingChatService.assertMembership(userId, data.propertyId);
        await BuildingChatService.markAsRead(data.propertyId, userId);
        io.to(`building:${data.propertyId}`).emit('building:read', {
          propertyId: data.propertyId,
          userId,
        });
      } catch {
        /* silent */
      }
    });

    // ============ Chat Events ============

    // Join a conversation room
    socket.on('chat:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Leave a conversation room
    socket.on('chat:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send a message
    socket.on('chat:message', async (data: { conversationId: string; text: string }) => {
      try {
        const message = await ChatService.sendMessage(
          data.conversationId,
          userId,
          data.text
        );

        // Emit to all in the conversation room
        io.to(`conversation:${data.conversationId}`).emit('chat:message', message);
      } catch (error) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Mark messages as read
    socket.on('chat:read', async (data: { conversationId: string }) => {
      try {
        await ChatService.markConversationAsRead(data.conversationId, userId);
        io.to(`conversation:${data.conversationId}`).emit('chat:read', {
          conversationId: data.conversationId,
          userId,
        });
      } catch (error) {
        // Silent fail for read receipts
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId} (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}
