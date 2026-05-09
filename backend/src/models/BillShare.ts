import mongoose, { Schema } from 'mongoose';
import { IBillShare } from '../types';

// Per-tenant share of a SharedBill. Separate from SharedBill so per-tenant
// state is queryable / indexable / atomically updatable.
const billShareSchema = new Schema<IBillShare>(
  {
    bill: {
      type: Schema.Types.ObjectId,
      ref: 'SharedBill',
      required: [true, 'Bill is required'],
    },
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['unpaid', 'pending_confirmation', 'paid', 'disputed', 'exempt'],
      default: 'unpaid',
    },
    markedPaidAt: { type: Date },
    confirmedAt: { type: Date },
    disputedAt: { type: Date },
    disputeReason: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

billShareSchema.index({ bill: 1, tenant: 1 }, { unique: true });
billShareSchema.index({ tenant: 1, status: 1 });

export const BillShare = mongoose.model<IBillShare>('BillShare', billShareSchema);
export default BillShare;
