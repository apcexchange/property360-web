import mongoose, { Schema } from 'mongoose';
import { IUnit } from '../types';

const unitSchema = new Schema<IUnit>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
    },
    bedrooms: {
      type: Number,
      default: 1,
    },
    bathrooms: {
      type: Number,
      default: 1,
    },
    size: {
      type: Number,
      default: 0,
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    defaultFees: {
      securityDeposit: { type: Number, default: 0 },
      cautionFee: { type: Number, default: 0 },
      agentFee: { type: Number, default: 0 },
      agreementFee: { type: Number, default: 0 },
      legalFee: { type: Number, default: 0 },
      serviceCharge: { type: Number, default: 0 },
      otherFee: { type: Number, default: 0 },
      otherFeeDescription: { type: String, default: '' },
    },
    // Listing / Marketplace fields
    isListed: { type: Boolean, default: false },
    listingTitle: { type: String, trim: true },
    listingDescription: { type: String, trim: true },
    listingStatus: {
      type: String,
      enum: ['active', 'inactive', 'reserved'],
      default: 'inactive',
    },
    listedAt: { type: Date },
    reservedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reservedAt: { type: Date },
    reservationExpiresAt: { type: Date },
    reservationPaymentRef: { type: String },
    // Enhanced listing details
    inspectionFee: { type: Number, default: 0 },
    inspectionFeeEnabled: { type: Boolean, default: false },
    virtualTourUrl: { type: String, trim: true },
    preferredTenantType: {
      type: String,
      enum: ['single', 'family', 'students', 'professionals', 'any'],
      default: 'any',
    },
    availableFrom: { type: Date },
    isNegotiable: { type: Boolean, default: false },
    reservationDays: { type: Number, default: 7 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
      },
    },
  }
);

unitSchema.index({ property: 1, unitNumber: 1 }, { unique: true });
unitSchema.index({ isListed: 1, listingStatus: 1 });
unitSchema.index({ rentAmount: 1 });

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
export default Unit;
