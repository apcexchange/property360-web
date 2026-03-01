import mongoose, { Schema } from 'mongoose';
import { ITenancyAgreement } from '../types';

const extractedDataSchema = new Schema(
  {
    leaseStartDate: { type: Date },
    leaseEndDate: { type: Date },
    rentAmount: { type: Number },
    securityDeposit: { type: Number },
    tenantName: { type: String },
    landlordName: { type: String },
    propertyAddress: { type: String },
    rawText: { type: String },
    confidence: { type: Number },
  },
  { _id: false }
);

const tenancyAgreementSchema = new Schema<ITenancyAgreement>(
  {
    lease: {
      type: Schema.Types.ObjectId,
      ref: 'Lease',
      required: [true, 'Lease is required'],
    },
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
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
    },
    // Document storage
    documentUrl: {
      type: String,
      required: [true, 'Document URL is required'],
    },
    documentPublicId: {
      type: String,
      required: [true, 'Document public ID is required'],
    },
    documentType: {
      type: String,
      enum: ['pdf', 'docx', 'image'],
      required: [true, 'Document type is required'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    // OCR extracted data
    extractedData: extractedDataSchema,
    // Processing status
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: {
      type: String,
    },
    // Tenant acknowledgment (legacy - kept for backwards compatibility)
    tenantAcknowledged: {
      type: Boolean,
      default: false,
    },
    tenantAcknowledgedAt: {
      type: Date,
    },
    // E-signature / DocuSeal integration
    signingStatus: {
      type: String,
      enum: ['not_sent', 'pending', 'sent', 'opened', 'signed', 'declined'],
      default: 'not_sent',
    },
    docusealSubmissionId: {
      type: Number,
    },
    docusealSubmitterId: {
      type: Number,
    },
    docusealTemplateId: {
      type: Number,
    },
    signingLink: {
      type: String,
    },
    signingSentAt: {
      type: Date,
    },
    signingOpenedAt: {
      type: Date,
    },
    signingCompletedAt: {
      type: Date,
    },
    signingDeclinedAt: {
      type: Date,
    },
    signedDocumentUrl: {
      type: String,
    },
    // Tenant info for signing
    tenantEmail: {
      type: String,
    },
    tenantName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
tenancyAgreementSchema.index({ lease: 1 });
tenancyAgreementSchema.index({ property: 1, createdAt: -1 });
tenancyAgreementSchema.index({ uploadedBy: 1, createdAt: -1 });
tenancyAgreementSchema.index({ processingStatus: 1 });
tenancyAgreementSchema.index({ signingStatus: 1 });
tenancyAgreementSchema.index({ docusealSubmissionId: 1 });
tenancyAgreementSchema.index({ docusealSubmitterId: 1 });

export const TenancyAgreement = mongoose.model<ITenancyAgreement>(
  'TenancyAgreement',
  tenancyAgreementSchema
);
export default TenancyAgreement;
