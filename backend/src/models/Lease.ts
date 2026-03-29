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
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by user is required'],
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
      default: 'annually',
    },
    // Late fee configuration
    gracePeriodDays: {
      type: Number,
      default: 3, // 3 days after due date before late fee
    },
    lateFeeType: {
      type: String,
      enum: ['none', 'fixed', 'percentage'],
      default: 'none',
    },
    lateFeeValue: {
      type: Number,
      default: 0,
    },
    // Auto invoice generation
    autoGenerateInvoice: {
      type: Boolean,
      default: false,
    },
    nextInvoiceDate: {
      type: Date,
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
      enum: ['pending', 'active', 'expired', 'terminated', 'declined'],
      default: 'pending',
    },
    // Guarantor information
    guarantor: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String },
      phone: { type: String },
      relationship: { type: String },
      occupation: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
      },
      idType: {
        type: String,
        enum: ['nin', 'drivers', 'passport', 'voters'],
      },
      idNumber: { type: String },
    },
    // Emergency contacts
    emergencyContacts: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        relationship: { type: String, required: true },
      },
    ],
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
