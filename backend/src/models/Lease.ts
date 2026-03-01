import mongoose, { Schema } from 'mongoose';
import { ILease } from '../types';

const leaseSchema = new Schema<ILease>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit is required'],
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
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
    },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually'],
      default: 'monthly',
    },
    // One-time fees (first year only)
    securityDeposit: {
      type: Number,
      default: 0,
    },
    cautionFee: {
      type: Number,
      default: 0,
    },
    agentFee: {
      type: Number,
      default: 0,
    },
    agreementFee: {
      type: Number,
      default: 0,
    },
    legalFee: {
      type: Number,
      default: 0,
    },
    serviceCharge: {
      type: Number,
      default: 0,
    },
    otherFee: {
      type: Number,
      default: 0,
    },
    otherFeeDescription: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

leaseSchema.index({ tenant: 1, status: 1 });
leaseSchema.index({ landlord: 1, status: 1 });
leaseSchema.index({ property: 1, unit: 1 });

export const Lease = mongoose.model<ILease>('Lease', leaseSchema);
export default Lease;
