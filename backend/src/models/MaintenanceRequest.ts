import mongoose, { Schema } from 'mongoose';
import { IMaintenanceRequest } from '../types';

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit is required'],
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    images: [{
      type: String,
    }],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

maintenanceRequestSchema.index({ property: 1, status: 1 });
maintenanceRequestSchema.index({ tenant: 1, createdAt: -1 });

export const MaintenanceRequest = mongoose.model<IMaintenanceRequest>(
  'MaintenanceRequest',
  maintenanceRequestSchema
);
export default MaintenanceRequest;
