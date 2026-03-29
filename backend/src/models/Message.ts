import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../types';

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation is required'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'system'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Attachment fields
    attachmentUrl: { type: String },
    attachmentPublicId: { type: String },
    attachmentName: { type: String },
    attachmentSize: { type: Number },
    attachmentMimeType: { type: String },
    audioDuration: { type: Number },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export default Message;
