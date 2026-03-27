import mongoose, { Schema } from 'mongoose';
import { IWallet } from '../types';

const walletSchema = new Schema<IWallet>(
  {
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ['NGN'],
      default: 'NGN',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Settings
    autoSettlement: {
      type: Boolean,
      default: true,
    },
    autoPayoutEnabled: {
      type: Boolean,
      default: false,
    },
    autoPayoutThreshold: {
      type: Number,
      default: 50000, // 50,000 Naira
    },
    defaultBankAccount: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
walletSchema.index({ landlord: 1 }, { unique: true });
walletSchema.index({ balance: 1 });

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);
