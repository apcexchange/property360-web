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
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
    },
    reference: {
      type: String,
      required: [true, 'Transaction reference is required'],
      unique: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ tenant: 1, createdAt: -1 });
transactionSchema.index({ landlord: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
