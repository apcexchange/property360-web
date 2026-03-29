import mongoose, { Schema } from 'mongoose';
import { IReservationRequest } from '../types';

const reservationRequestSchema = new Schema<IReservationRequest>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant is required'],
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit is required'],
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'paid', 'expired', 'cancelled'],
      default: 'pending',
    },
    message: { type: String, trim: true },
    declineReason: { type: String, trim: true },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    paymentType: {
      type: String,
      enum: ['inspection', 'full'],
    },
    paymentAmount: { type: Number },
    paymentRef: { type: String },
    reservationDays: {
      type: Number,
      required: true,
      default: 7,
    },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
  }
);

// Index for duplicate checking (same tenant + unit + active status)
reservationRequestSchema.index({ tenant: 1, unit: 1, status: 1 });
// Index for landlord queries
reservationRequestSchema.index({ landlord: 1, status: 1 });
// Index for tenant queries
reservationRequestSchema.index({ tenant: 1, createdAt: -1 });

export const ReservationRequest = mongoose.model<IReservationRequest>(
  'ReservationRequest',
  reservationRequestSchema
);
export default ReservationRequest;
