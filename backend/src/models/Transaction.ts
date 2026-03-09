import mongoose, { Schema } from 'mongoose';
import { ITransaction } from '../types';

const transactionSchema = new Schema<ITransaction>(
  {
    lease: {
      type: Schema.Types.ObjectId,
      ref: 'Lease',
      required: [true, 'Lease is required'],
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    type: {
      type: String,
      enum: ['rent', 'deposit', 'maintenance', 'other'],
      default: 'rent',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'voided'],
      default: 'completed',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'],
      required: [true, 'Payment method is required'],
    },
    reference: {
      type: String,
      sparse: true, // Allows null/undefined but unique when present
    },
    description: {
      type: String,
    },
    // New fields for manual payment recording
    paymentDate: {
      type: Date,
      default: Date.now, // Actual date payment was received (allows backdating)
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by user is required'],
    },
    notes: {
      type: String, // Internal notes for landlord
    },
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    voidReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ tenant: 1, createdAt: -1 });
transactionSchema.index({ landlord: 1, createdAt: -1 });
transactionSchema.index({ lease: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 }, { sparse: true, unique: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
