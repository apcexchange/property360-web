import mongoose, { Schema } from 'mongoose';
import { IWalletTransaction } from '../types';

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'withdrawal', 'refund', 'fee'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending',
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    sourceTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    sourceInvoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    payout: {
      type: Schema.Types.ObjectId,
      ref: 'Payout',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ landlord: 1, createdAt: -1 });
walletTransactionSchema.index({ reference: 1 }, { unique: true });
walletTransactionSchema.index({ sourceTransaction: 1 });
walletTransactionSchema.index({ status: 1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
