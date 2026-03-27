import mongoose, { Schema } from 'mongoose';
import { IPayout } from '../types';

const payoutSchema = new Schema<IPayout>(
  {
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100, // Minimum 100 Naira
    },
    fee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'reversed'],
      default: 'pending',
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    paystackTransferCode: {
      type: String,
    },
    paystackReference: {
      type: String,
    },
    paystackResponse: {
      type: Schema.Types.Mixed,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAutoPayout: {
      type: Boolean,
      default: false,
    },
    walletTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'WalletTransaction',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
payoutSchema.index({ landlord: 1, createdAt: -1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ reference: 1 }, { unique: true });
payoutSchema.index({ paystackTransferCode: 1 });

export const Payout = mongoose.model<IPayout>('Payout', payoutSchema);
