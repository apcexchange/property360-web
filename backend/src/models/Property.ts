import mongoose, { Schema } from 'mongoose';
import { IProperty } from '../types';

const propertySchema = new Schema<IProperty>(
  {
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      postalCode: {
        type: String,
      },
    },
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'commercial', 'land'],
      required: [true, 'Property type is required'],
    },
    units: {
      type: Number,
      default: 1,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Property owner is required'],
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    images: [{
      type: String,
    }],
    amenities: [{
      type: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
propertySchema.index({ owner: 1, isActive: 1 });
propertySchema.index({ 'address.state': 1, 'address.city': 1 });

export const Property = mongoose.model<IProperty>('Property', propertySchema);
export default Property;
