import mongoose, { Schema } from 'mongoose';
import { IPaymentGateway } from '../types';

const paymentGatewaySchema = new Schema<IPaymentGateway>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice is required'],
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    gateway: {
      type: String,
      enum: ['paystack', 'flutterwave'],
      required: [true, 'Gateway is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'abandoned'],
      default: 'pending',
    },
    gatewayReference: {
      type: String,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    paidAt: {
      type: Date,
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
paymentGatewaySchema.index({ reference: 1 }, { unique: true });
paymentGatewaySchema.index({ invoice: 1 });
paymentGatewaySchema.index({ tenant: 1, createdAt: -1 });
paymentGatewaySchema.index({ status: 1 });

export const PaymentGateway = mongoose.model<IPaymentGateway>('PaymentGateway', paymentGatewaySchema);
export default PaymentGateway;
