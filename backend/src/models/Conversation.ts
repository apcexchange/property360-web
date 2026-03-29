import mongoose, { Schema } from 'mongoose';
import { IConversation } from '../types';

const conversationSchema = new Schema<IConversation>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Listing (unit) is required'],
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant is required'],
    },
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord is required'],
    },
    lastMessage: {
      text: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
    tenantUnreadCount: {
      type: Number,
      default: 0,
    },
    landlordUnreadCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ tenant: 1, landlord: 1, listing: 1 }, { unique: true });
conversationSchema.index({ tenant: 1, updatedAt: -1 });
conversationSchema.index({ landlord: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
export default Conversation;
