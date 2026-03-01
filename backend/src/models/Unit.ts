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

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
export default Unit;
