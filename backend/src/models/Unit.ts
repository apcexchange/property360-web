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
  },
  {
    timestamps: true,
  }
);

unitSchema.index({ property: 1, unitNumber: 1 }, { unique: true });

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
export default Unit;
