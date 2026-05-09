import {
  BuildingChat,
  BuildingMessage,
  Lease,
  Property,
} from '../models';
import { IBuildingMessage } from '../types';
import { AppError } from '../middleware';
import TenantService from './TenantService';

interface SendMessagePayload {
  text?: string;
  messageType?: IBuildingMessage['messageType'];
  attachmentUrl?: string;
  attachmentPublicId?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  audioDuration?: number;
}

class BuildingChatService {
  /**
   * Find or create the chat doc for a Property. The chat is unique per
   * property (enforced by the unique index on BuildingChat.property).
   */
  async getOrCreateChat(propertyId: string) {
    const property = await Property.findById(propertyId).select('_id name');
    if (!property) throw new AppError('Property not found', 404);

    let chat = await BuildingChat.findOne({ property: propertyId });
    if (!chat) {
      chat = await BuildingChat.create({ property: propertyId });
    }
    return chat;
  }

  /**
   * Throws AppError(403) unless the user has an active lease on the property.
   * Reused by the socket layer (which can't run Express middleware).
   */
  async assertMembership(userId: string, propertyId: string): Promise<void> {
    const lease = await Lease.findOne({
      property: propertyId,
      tenant: userId,
      status: 'active',
    }).select('_id');
    if (!lease) throw new AppError('You are not a tenant of this building', 403);
  }

  /**
   * Building roster — derived live from active leases. Don't cache; tenants
   * move in and out and we want the chat to reflect current occupancy.
   */
  async getMembers(propertyId: string) {
    return TenantService.getActiveTenantsForProperty(propertyId);
  }

  /**
   * Persist a message and update the chat's lastMessage cache so the home-card
   * preview is cheap to read. Returns a populated message.
   */
  async sendMessage(propertyId: string, senderId: string, payload: SendMessagePayload) {
    const chat = await this.getOrCreateChat(propertyId);

    const message = await BuildingMessage.create({
      chat: chat._id,
      sender: senderId,
      text: payload.text || '',
      messageType: payload.messageType || 'text',
      attachmentUrl: payload.attachmentUrl,
      attachmentPublicId: payload.attachmentPublicId,
      attachmentName: payload.attachmentName,
      attachmentSize: payload.attachmentSize,
      attachmentMimeType: payload.attachmentMimeType,
      audioDuration: payload.audioDuration,
      readBy: [{ user: senderId, at: new Date() }],
    });

    await BuildingChat.findByIdAndUpdate(chat._id, {
      lastMessage: {
        text: payload.text || `[${message.messageType}]`,
        sender: senderId,
        createdAt: message.createdAt,
      },
    });

    return BuildingMessage.findById(message._id).populate(
      'sender',
      'firstName lastName avatar'
    );
  }

  /**
   * Paginated message list, newest first. The mobile chat screen renders into
   * an inverted FlatList so this order is exactly what it wants.
   */
  async getMessages(propertyId: string, page = 1, limit = 30) {
    const chat = await this.getOrCreateChat(propertyId);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      BuildingMessage.find({ chat: chat._id })
        .populate('sender', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BuildingMessage.countDocuments({ chat: chat._id }),
    ]);

    return {
      messages,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark unread messages as read for this user. Idempotent — only adds the
   * read receipt to messages where the user isn't already in `readBy`.
   */
  async markAsRead(propertyId: string, userId: string): Promise<void> {
    const chat = await this.getOrCreateChat(propertyId);
    await BuildingMessage.updateMany(
      { chat: chat._id, 'readBy.user': { $ne: userId } },
      { $push: { readBy: { user: userId, at: new Date() } } }
    );
  }

  /**
   * Lightweight summary for the TenantHome "Your Building" card.
   * Kept fast — one chat lookup, one count query, one members count.
   */
  async getPreview(propertyId: string, userId: string) {
    const chat = await BuildingChat.findOne({ property: propertyId }).populate(
      'lastMessage.sender',
      'firstName lastName'
    );
    const members = await TenantService.getActiveTenantsForProperty(propertyId);

    let unreadCount = 0;
    if (chat) {
      unreadCount = await BuildingMessage.countDocuments({
        chat: chat._id,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
      });
    }

    return {
      lastMessage: chat?.lastMessage || null,
      memberCount: members.length,
      unreadCount,
    };
  }
}

export default new BuildingChatService();
