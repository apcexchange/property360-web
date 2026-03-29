import { Conversation, Message, Unit, Property } from '../models';
import { IConversation, IMessage } from '../types';
import { AppError } from '../middleware';

class ChatService {
  /**
   * Get or create a conversation for a listing
   */
  async getOrCreateConversation(tenantId: string, unitId: string) {
    const unit = await Unit.findById(unitId).populate('property');
    if (!unit || !unit.isListed) {
      throw new AppError('Listing not found', 404);
    }

    const property = await Property.findById(unit.property);
    if (!property) throw new AppError('Property not found', 404);

    const landlordId = property.owner.toString();

    if (tenantId === landlordId) {
      throw new AppError('Cannot start a conversation with yourself', 400);
    }

    // Find existing or create new
    let conversation = await Conversation.findOne({
      tenant: tenantId,
      landlord: landlordId,
      listing: unitId,
    })
      .populate('tenant', 'firstName lastName avatar')
      .populate('landlord', 'firstName lastName avatar')
      .populate('listing', 'unitNumber rentAmount')
      .populate('property', 'name address images');

    if (!conversation) {
      conversation = await Conversation.create({
        tenant: tenantId,
        landlord: landlordId,
        listing: unitId,
        property: property._id,
      });

      // Re-populate after create
      conversation = await Conversation.findById(conversation._id)
        .populate('tenant', 'firstName lastName avatar')
        .populate('landlord', 'firstName lastName avatar')
        .populate('listing', 'unitNumber rentAmount')
        .populate('property', 'name address images');
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    const conversations = await Conversation.find({
      $or: [{ tenant: userId }, { landlord: userId }],
      isActive: true,
    })
      .populate('tenant', 'firstName lastName avatar')
      .populate('landlord', 'firstName lastName avatar')
      .populate('listing', 'unitNumber rentAmount listingTitle')
      .populate('property', 'name address images')
      .sort({ updatedAt: -1 });

    return conversations.map((conv: any) => {
      const isTenant = conv.tenant._id.toString() === userId;
      const otherParty = isTenant ? conv.landlord : conv.tenant;
      const unreadCount = isTenant ? conv.tenantUnreadCount : conv.landlordUnreadCount;

      return {
        id: conv._id.toString(),
        otherParty: {
          id: otherParty._id.toString(),
          firstName: otherParty.firstName,
          lastName: otherParty.lastName,
          avatar: otherParty.avatar,
        },
        listing: conv.listing ? {
          id: conv.listing._id.toString(),
          unitNumber: conv.listing.unitNumber,
          rentAmount: conv.listing.rentAmount,
          listingTitle: conv.listing.listingTitle,
        } : null,
        property: conv.property ? {
          id: conv.property._id.toString(),
          name: conv.property.name,
          image: conv.property.images?.[0] || null,
        } : null,
        lastMessage: conv.lastMessage ? {
          text: conv.lastMessage.text,
          createdAt: conv.lastMessage.createdAt,
          isOwn: conv.lastMessage.sender?.toString() === userId,
        } : null,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    });
  }

  /**
   * Get messages for a conversation (paginated)
   */
  async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50) {
    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [{ tenant: userId }, { landlord: userId }],
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .populate('sender', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ conversation: conversationId }),
    ]);

    return {
      messages: messages.reverse(), // oldest first for display
      total,
      pages: Math.ceil(total / limit),
      page,
    };
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    messageType: string = 'text',
    attachment?: {
      url: string;
      publicId?: string;
      name?: string;
      size?: number;
      mimeType?: string;
      audioDuration?: number;
    }
  ) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [{ tenant: senderId }, { landlord: senderId }],
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const messageData: Record<string, unknown> = {
      conversation: conversationId,
      sender: senderId,
      text: text || (messageType === 'image' ? '📷 Photo' : messageType === 'file' ? '📎 File' : messageType === 'audio' ? '🎙 Voice message' : ''),
      messageType,
    };

    if (attachment) {
      messageData.attachmentUrl = attachment.url;
      messageData.attachmentPublicId = attachment.publicId;
      messageData.attachmentName = attachment.name;
      messageData.attachmentSize = attachment.size;
      messageData.attachmentMimeType = attachment.mimeType;
      messageData.audioDuration = attachment.audioDuration;
    }

    const message = await Message.create(messageData);

    // Update conversation's last message and unread counts
    const isTenant = conversation.tenant.toString() === senderId;
    const updateData: Record<string, unknown> = {
      lastMessage: {
        text,
        sender: senderId,
        createdAt: new Date(),
      },
    };

    if (isTenant) {
      updateData.$inc = { landlordUnreadCount: 1 };
    } else {
      updateData.$inc = { tenantUnreadCount: 1 };
    }

    // Use two operations: set lastMessage and increment count
    const lastMessageText = text || (messageType === 'image' ? '📷 Photo' : messageType === 'file' ? '📎 File' : messageType === 'audio' ? '🎙 Voice message' : '');
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: { text: lastMessageText, sender: senderId, createdAt: new Date() },
    });
    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: isTenant ? { landlordUnreadCount: 1 } : { tenantUnreadCount: 1 },
    });

    // Populate sender for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName avatar');

    return populatedMessage;
  }

  /**
   * Mark conversation as read for a user
   */
  async markConversationAsRead(conversationId: string, userId: string) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      $or: [{ tenant: userId }, { landlord: userId }],
    });

    if (!conversation) return;

    const isTenant = conversation.tenant.toString() === userId;

    // Reset unread count
    if (isTenant) {
      conversation.tenantUnreadCount = 0;
    } else {
      conversation.landlordUnreadCount = 0;
    }
    await conversation.save();

    // Mark all messages from other party as read
    const otherPartyId = isTenant ? conversation.landlord : conversation.tenant;
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: otherPartyId,
        isRead: false,
      },
      { isRead: true }
    );
  }

  /**
   * Get total unread count across all conversations
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const conversations = await Conversation.find({
      $or: [{ tenant: userId }, { landlord: userId }],
      isActive: true,
    });

    return conversations.reduce((total, conv) => {
      const isTenant = conv.tenant.toString() === userId;
      return total + (isTenant ? conv.tenantUnreadCount : conv.landlordUnreadCount);
    }, 0);
  }
}

export default new ChatService();
