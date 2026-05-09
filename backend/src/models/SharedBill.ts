import mongoose, { Schema } from 'mongoose';
import { ISharedBill } from '../types';

// Tenant-created bill split among neighbors. Self-reported payment lifecycle —
// no Paystack integration. participantSnapshot is frozen at creation; tenants
// who join the building later are NOT auto-added to existing bills.
const sharedBillSchema = new Schema<ISharedBill>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['water', 'fuel', 'security', 'cleaning', 'repairs', 'other'],
      required: [true, 'Category is required'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    splitMethod: {
      type: String,
      enum: ['equal', 'by_unit_count', 'custom'],
      default: 'equal',
    },
    participantSnapshot: [
      {
        tenant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
        unitNumber: { type: String, required: true },
      },
    ],
    creatorIncluded: {
      type: Boolean,
      default: true,
    },
    bankDetails: {
      accountName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      bankName: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: ['open', 'settled', 'cancelled'],
      default: 'open',
    },
    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

sharedBillSchema.index({ property: 1, status: 1, createdAt: -1 });
sharedBillSchema.index({ creator: 1, createdAt: -1 });

export const SharedBill = mongoose.model<ISharedBill>('SharedBill', sharedBillSchema);
export default SharedBill;
