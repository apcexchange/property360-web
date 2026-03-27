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
  isDeleted: boolean;
  deletedAt?: Date;
  deletedEmail?: string; // Original email before anonymization
  deletedPhone?: string; // Original phone before anonymization
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

// Guarantor interface
export interface IGuarantor {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  relationship: string;
  occupation?: string;
  address?: {
    street: string;
    city: string;
    state: string;
  };
  idType?: 'nin' | 'drivers' | 'passport' | 'voters';
  idNumber?: string;
}

// Emergency Contact interface
export interface IEmergencyContact {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  relationship: string;
}

// Lease interface
export interface ILease extends Document {
  property: IProperty['_id'];
  unit: IUnit['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  assignedBy: IUser['_id']; // The user (landlord or agent) who assigned the tenant
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'annually';
  // Late fee configuration
  gracePeriodDays: number; // Days after due date before late fee applies
  lateFeeType: 'none' | 'fixed' | 'percentage';
  lateFeeValue: number; // Fixed amount or percentage (0-100)
  // Auto invoice generation
  autoGenerateInvoice: boolean;
  nextInvoiceDate?: Date;
  // One-time fees (first year only)
  securityDeposit: number;
  cautionFee: number;
  agentFee: number;
  agreementFee: number;
  legalFee: number;
  serviceCharge: number;
  otherFee: number;
  otherFeeDescription: string;
  status: 'pending' | 'active' | 'expired' | 'terminated' | 'declined';
  // Guarantor information
  guarantor?: IGuarantor;
  // Emergency contacts
  emergencyContacts?: IEmergencyContact[];
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
  status: 'pending' | 'completed' | 'failed' | 'voided';
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'other';
  reference?: string;
  description?: string;
  // Manual payment recording fields
  paymentDate: Date;
  recordedBy: IUser['_id'];
  notes?: string;
  // Voiding fields
  voidedAt?: Date;
  voidedBy?: IUser['_id'];
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice status
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

// Invoice line item interface
export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Invoice interface
export interface IInvoice extends Document {
  invoiceNumber: string;
  landlord: IUser['_id'];
  tenant: IUser['_id'];
  property: IProperty['_id'];
  unit?: IUnit['_id'];
  lease?: ILease['_id'];
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  // Partial payment tracking
  amountPaid: number;
  amountDue: number;
  // Late fee
  lateFee: number;
  lateFeeAppliedAt?: Date;
  // Billing period (for auto-generated invoices)
  periodStart?: Date;
  periodEnd?: Date;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  sentAt?: Date;
  paidAt?: Date;
  // Multiple payments support
  payments: ITransaction['_id'][];
  paymentTransaction?: ITransaction['_id']; // Deprecated: use payments array
  notes?: string;
  internalNotes?: string;
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
  type: 'payment' | 'maintenance' | 'lease' | 'invitation' | 'general';
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

// Agent invitation status
export enum AgentInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

// Agent permissions interface
export interface IAgentPermissions {
  canAddTenant: boolean;
  canRemoveTenant: boolean;
  canRecordPayment: boolean;
  canViewPayments: boolean;
  canRenewLease: boolean;
  canManageMaintenance: boolean;
  canViewReports: boolean;
  canUploadAgreements: boolean;
}

// Landlord-Agent relationship interface
export interface ILandlordAgent extends Document {
  landlord: IUser['_id'];
  agent: IUser['_id'];
  properties: IProperty['_id'][];
  permissions: IAgentPermissions;
  isActive: boolean;
  invitedAt: Date;
  acceptedAt?: Date;
  status: AgentInvitationStatus;
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

// Extended AuthRequest with landlordId for agents
export interface AuthRequestWithLandlord extends AuthRequest {
  landlordId?: IUser['_id'];
}

// Receipt interface
export interface IReceipt extends Document {
  receiptNumber: string;
  transaction: ITransaction['_id'];
  invoice?: IInvoice['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  property: IProperty['_id'];
  unit?: IUnit['_id'];
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'card' | 'other';
  paymentDate: Date;
  description: string;
  issuedAt: Date;
  issuedBy: IUser['_id'];
  emailedAt?: Date;
  emailedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Late fee type
export type LateFeeType = 'none' | 'fixed' | 'percentage';

// Payment gateway transaction status
export type PaymentGatewayStatus = 'pending' | 'success' | 'failed' | 'abandoned';

// Payment gateway transaction interface
export interface IPaymentGateway extends Document {
  reference: string;
  invoice: IInvoice['_id'];
  tenant: IUser['_id'];
  landlord: IUser['_id'];
  amount: number;
  gateway: 'paystack' | 'flutterwave';
  status: PaymentGatewayStatus;
  gatewayReference?: string;
  gatewayResponse?: Record<string, unknown>;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// =====================
// WALLET SYSTEM TYPES
// =====================

// Wallet interface
export interface IWallet extends Document {
  landlord: IUser['_id'];
  balance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingBalance: number;
  currency: 'NGN';
  isActive: boolean;
  // Settings
  autoSettlement: boolean;
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: number;
  defaultBankAccount?: IBankAccount['_id'];
  createdAt: Date;
  updatedAt: Date;
}

// Bank Account interface
export interface IBankAccount extends Document {
  landlord: IUser['_id'];
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  recipientCode: string;
  isVerified: boolean;
  isPrimary: boolean;
  isActive: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Wallet transaction types
export type WalletTransactionType = 'credit' | 'debit' | 'withdrawal' | 'refund' | 'fee';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

// Wallet Transaction interface
export interface IWalletTransaction extends Document {
  wallet: IWallet['_id'];
  landlord: IUser['_id'];
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description: string;
  reference: string;
  sourceTransaction?: ITransaction['_id'];
  sourceInvoice?: IInvoice['_id'];
  payout?: IPayout['_id'];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Payout status
export type PayoutStatus = 'pending' | 'processing' | 'success' | 'failed' | 'reversed';

// Payout interface
export interface IPayout extends Document {
  landlord: IUser['_id'];
  wallet: IWallet['_id'];
  bankAccount: IBankAccount['_id'];
  amount: number;
  fee: number;
  netAmount: number;
  status: PayoutStatus;
  reference: string;
  paystackTransferCode?: string;
  paystackReference?: string;
  paystackResponse?: Record<string, unknown>;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  requestedBy: IUser['_id'];
  isAutoPayout: boolean;
  walletTransaction?: IWalletTransaction['_id'];
  createdAt: Date;
  updatedAt: Date;
}
