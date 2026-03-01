import { Request } from 'express';
import { Document } from 'mongoose';

// User roles
export enum UserRole {
  LANDLORD = 'landlord',
  TENANT = 'tenant',
  AGENT = 'agent',
}

// KYC verification status
export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

// ID document types
export enum IDDocumentType {
  NIN = 'nin',
  DRIVERS_LICENSE = 'drivers',
  PASSPORT = 'passport',
  VOTERS_CARD = 'voters',
}

// KYC Document interface
export interface IKYCDocument {
  type: IDDocumentType;
  number: string;
  imageUrl: string;
  uploadedAt: Date;
}

// User interface
export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  nin?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  kyc?: {
    status: KYCStatus;
    selfieUrl?: string;
    selfieUploadedAt?: Date;
    document?: IKYCDocument;
    verifiedAt?: Date;
    rejectionReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Property interface
export interface IProperty extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  propertyType: 'apartment' | 'house' | 'commercial' | 'land';
  units: number;
  owner: IUser['_id'];
  agent?: IUser['_id'];
  images: string[];
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Default fees interface for units
export interface IDefaultFees {
  securityDeposit: number;
  cautionFee: number;
  agentFee: number;
  agreementFee: number;
  legalFee: number;
  serviceCharge: number;
  otherFee: number;
  otherFeeDescription: string;
}

// Unit interface
export interface IUnit extends Document {
  property: IProperty['_id'];
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  rentAmount: number;
  isOccupied: boolean;
  tenant?: IUser['_id'];
  defaultFees?: IDefaultFees;
  createdAt: Date;
  updatedAt: Date;
}

// Lease interface
export interface ILease extends Document {
  property: IProperty['_id'];
  unit: IUnit['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annually';
  // One-time fees (first year only)
  securityDeposit: number;
  cautionFee: number;
  agentFee: number;
  agreementFee: number;
  legalFee: number;
  serviceCharge: number;
  otherFee: number;
  otherFeeDescription: string;
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface
export interface ITransaction extends Document {
  lease: ILease['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  amount: number;
  type: 'rent' | 'deposit' | 'maintenance' | 'other';
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  reference: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Maintenance request interface
export interface IMaintenanceRequest extends Document {
  property: IProperty['_id'];
  unit: IUnit['_id'];
  tenant: IUser['_id'];
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  images: string[];
  assignedTo?: IUser['_id'];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
export interface INotification extends Document {
  user: IUser['_id'];
  title: string;
  message: string;
  type: 'payment' | 'maintenance' | 'lease' | 'general';
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: IUser;
}

// Document type for tenancy agreements
export enum AgreementDocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  IMAGE = 'image',
}

// Processing status for OCR
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Signing status for e-signatures
export enum SigningStatus {
  NOT_SENT = 'not_sent',
  PENDING = 'pending',
  SENT = 'sent',
  OPENED = 'opened',
  SIGNED = 'signed',
  DECLINED = 'declined',
}

// Extracted data from OCR
export interface IExtractedLeaseData {
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  rentAmount?: number;
  securityDeposit?: number;
  tenantName?: string;
  landlordName?: string;
  propertyAddress?: string;
  rawText?: string;
  confidence?: number;
}

// Tenancy Agreement interface
export interface ITenancyAgreement extends Document {
  lease: ILease['_id'];
  property: IProperty['_id'];
  unit: IUnit['_id'];
  uploadedBy: IUser['_id'];
  // Document storage
  documentUrl: string;
  documentPublicId: string;
  documentType: 'pdf' | 'docx' | 'image';
  originalFilename: string;
  fileSize: number;
  // OCR extracted data
  extractedData?: IExtractedLeaseData;
  // Processing status
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  // Tenant acknowledgment (legacy)
  tenantAcknowledged: boolean;
  tenantAcknowledgedAt?: Date;
  // E-signature / DocuSeal integration
  signingStatus: 'not_sent' | 'pending' | 'sent' | 'opened' | 'signed' | 'declined';
  docusealSubmissionId?: number;
  docusealSubmitterId?: number;
  docusealTemplateId?: number;
  signingLink?: string;
  signingSentAt?: Date;
  signingOpenedAt?: Date;
  signingCompletedAt?: Date;
  signingDeclinedAt?: Date;
  signedDocumentUrl?: string;
  tenantEmail?: string;
  tenantName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
