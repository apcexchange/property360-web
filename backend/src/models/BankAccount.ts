import mongoose, { Schema } from 'mongoose';
import { IBankAccount } from '../types';

const bankAccountSchema = new Schema<IBankAccount>(
  {
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    recipientCode: {
      type: String,
      required: true,
      unique: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bankAccountSchema.index({ landlord: 1, accountNumber: 1 }, { unique: true });
bankAccountSchema.index({ recipientCode: 1 }, { unique: true });
bankAccountSchema.index({ landlord: 1, isPrimary: 1 });

export const BankAccount = mongoose.model<IBankAccount>('BankAccount', bankAccountSchema);
