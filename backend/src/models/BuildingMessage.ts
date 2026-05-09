import mongoose, { Schema } from 'mongoose';
import { IBuildingMessage } from '../types';

const buildingMessageSchema = new Schema<IBuildingMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'BuildingChat',
      required: [true, 'Chat is required'],
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
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
      },
    ],
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

buildingMessageSchema.index({ chat: 1, createdAt: -1 });

export const BuildingMessage = mongoose.model<IBuildingMessage>(
  'BuildingMessage',
  buildingMessageSchema
);
export default BuildingMessage;
