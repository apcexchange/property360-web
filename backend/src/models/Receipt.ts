import mongoose, { Schema } from 'mongoose';
import { IReceipt } from '../types';

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction is required'],
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
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
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card', 'other'],
      required: [true, 'Payment method is required'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issued by user is required'],
    },
    // For email tracking
    emailedAt: {
      type: Date,
    },
    emailedTo: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
receiptSchema.index({ receiptNumber: 1 }, { unique: true });
receiptSchema.index({ tenant: 1, createdAt: -1 });
receiptSchema.index({ landlord: 1, createdAt: -1 });
receiptSchema.index({ transaction: 1 }, { unique: true });
receiptSchema.index({ invoice: 1 });
receiptSchema.index({ property: 1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);
export default Receipt;
