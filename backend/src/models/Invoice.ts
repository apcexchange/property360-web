import mongoose, { Schema } from 'mongoose';
import { IInvoice } from '../types';

const invoiceLineItemSchema = new Schema(
  {
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 200,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord is required'],
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tenant is required'],
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    unit: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
    },
    lease: {
      type: Schema.Types.ObjectId,
      ref: 'Lease',
    },
    lineItems: {
      type: [invoiceLineItemSchema],
      required: true,
      validate: [
        (v: unknown[]) => v.length > 0,
        'At least one line item is required',
      ],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    taxRate: {
      type: Number,
      default: 0.075,
    },
    taxAmount: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    // Partial payment tracking
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      required: true,
    },
    // Late fee
    lateFee: {
      type: Number,
      default: 0,
    },
    lateFeeAppliedAt: {
      type: Date,
    },
    // Billing period (for auto-generated invoices)
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    sentAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    // Multiple payments support
    payments: [{
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    }],
    paymentTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
invoiceSchema.index({ landlord: 1, createdAt: -1 });
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ property: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ status: 1, dueDate: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
export default Invoice;
