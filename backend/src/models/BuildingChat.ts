import mongoose, { Schema } from 'mongoose';
import { IBuildingChat } from '../types';

// One chat document per Property. Members are NOT stored — they're derived
// live from Lease.find({ property, status: 'active' }) so move-in/move-out
// is automatic.
const buildingChatSchema = new Schema<IBuildingChat>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
      unique: true,
    },
    lastMessage: {
      text: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
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

export const BuildingChat = mongoose.model<IBuildingChat>('BuildingChat', buildingChatSchema);
export default BuildingChat;
