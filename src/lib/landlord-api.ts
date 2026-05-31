"use client";

import { api, unwrap } from "./api";

// ----- Shared types (mirror backend response shapes) -----

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
}

export interface PropertyImage {
  url: string;
  publicId?: string;
  isPrimary?: boolean;
}

export type PropertyType =
  | "residential"
  | "hostel"
  | "shop"
  | "commercial"
  // Legacy values pre-existing rows may still carry.
  | "apartment"
  | "house"
  | "bungalow"
  | "land";

export interface Property {
  _id: string;
  name: string;
  description?: string;
  address: Address;
  propertyType: PropertyType;
  floors: number;
  totalUnits: number;
  amenities?: string[];
  images?: PropertyImage[];
  videos?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RentPeriod = "daily" | "monthly" | "annually";

export interface UnitFees {
  securityDeposit?: number;
  cautionFee?: number;
  agentFee?: number;
  agreementFee?: number;
  legalFee?: number;
  serviceCharge?: number;
  otherFee?: number;
  otherFeeDescription?: string;
}

export interface Unit {
  _id: string;
  property: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  size?: number;
  rentAmount: number;
  rentPeriod?: RentPeriod;
  defaultFees?: UnitFees;
  isOccupied: boolean;
  tenant?: string;
  createdAt: string;
}

export interface PropertyOwnership {
  ownership: "self" | "managed";
  managedFor?: {
    landlordId: string;
    landlordName: string;
  };
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  activeTenants: number;
  monthlyRevenue: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  revenueChange: number;
  newPropertiesThisMonth: number;
  newTenantsThisMonth: number;
  ownedPropertyCount?: number;
  managedPropertyCount?: number;
  propertyOwnership?: Record<string, PropertyOwnership>;
}

export interface RecentActivity {
  id: string;
  type: "payment" | "maintenance" | "lease" | "property" | "document";
  text: string;
  time: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Tenant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "tenant";
}

export type LeaseStatus = "pending" | "active" | "expired" | "terminated" | "declined";
export type PaymentFrequency = "monthly" | "quarterly" | "annually";

export type LateFeeType = "none" | "fixed" | "percentage";

export interface Lease {
  _id: string;
  property: string | Property;
  unit: string | Unit;
  tenant: string | Tenant;
  landlord: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  status: LeaseStatus;
  fees?: UnitFees;
  // Recurring billing — when true, the nightly cron drafts and emails
  // the next rent invoice as `nextInvoiceDate` passes.
  autoGenerateInvoice?: boolean;
  nextInvoiceDate?: string;
  gracePeriodDays?: number;
  lateFeeType?: LateFeeType;
  lateFeeValue?: number;
  createdAt: string;
}

/**
 * Shape returned by /tenants/occupied-units — a slimmed Lease the
 * backend builds explicitly with `id` (not `_id`). Keep it separate
 * from `Lease` so callers using the full Lease shape elsewhere still
 * get `_id`.
 */
export interface LeaseSummary {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  status: LeaseStatus;
  autoGenerateInvoice?: boolean;
  nextInvoiceDate?: string | null;
  gracePeriodDays?: number | null;
  lateFeeType?: LateFeeType;
  lateFeeValue?: number;
}

/** Slimmed property/unit/tenant shapes that /tenants/occupied-units returns. */
export interface PropertySummary {
  id: string;
  name: string;
  address?: Address;
}
export interface UnitSummary {
  id: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
}
export interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  tenant: Tenant | string;
  property: Property | string;
  unit: Unit | string;
  lease: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
}

export type ReceiptPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "mobile_money"
  | "card"
  | "other";

export interface Receipt {
  _id: string;
  id?: string;
  receiptNumber: string;
  transaction: string | { _id: string; amount: number };
  invoice?:
    | string
    | { _id: string; invoiceNumber: string; total: number; amountPaid: number; amountDue: number }
    | null;
  tenant:
    | string
    | { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  landlord: string | { _id: string; firstName: string; lastName: string };
  property: string | { _id: string; name: string; address?: Address };
  unit?: string | { _id: string; unitNumber: string };
  amount: number;
  paymentMethod: ReceiptPaymentMethod;
  paymentDate: string;
  description: string;
  issuedAt: string;
  emailedAt?: string;
  emailedTo?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  createdAt: string;
}

export type MaintenanceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";

export interface MaintenanceRequest {
  _id: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  images: string[];
  property: { _id: string; name: string; address?: Address } | string;
  unit: { _id: string; unitNumber: string } | string;
  tenant:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        avatar?: string;
      }
    | string;
  assignedTo?:
    | { _id: string; firstName: string; lastName: string; email?: string }
    | string
    | null;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalPaidOut: number;
  currency: "NGN";
}

export interface WalletTransaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  reference?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export interface Bank {
  code: string;
  name: string;
}

export interface BankAccount {
  _id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
}

export type PayoutStatus = "pending" | "processing" | "successful" | "failed" | "reversed";

export interface Payout {
  _id: string;
  amount: number;
  reference: string;
  status: PayoutStatus;
  bankAccount: BankAccount | string;
  createdAt: string;
  completedAt?: string;
}

export type LeasePaymentMethod = "cash" | "bank_transfer" | "paystack" | "other";

/** Mirrors the Transaction wire shape returned by /tenants/lease/:id/payments. */
export interface LeasePayment {
  _id: string;
  lease: string;
  amount: number;
  paymentDate: string;
  paymentMethod: LeasePaymentMethod;
  status?: "pending" | "completed" | "failed" | "voided";
  reference?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Cross-lease Transaction shape returned by GET /tenants/transactions.
 * Populated with tenant + lease.property + lease.unit so the combined
 * transactions page can render each row without further lookups.
 */
export type LandlordTransactionPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "mobile_money"
  | "card"
  | "other";

export type LandlordTransactionType =
  | "rent"
  | "deposit"
  | "maintenance"
  | "other";

export type LandlordTransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "voided";

export interface LandlordTransaction {
  _id: string;
  amount: number;
  type: LandlordTransactionType;
  status: LandlordTransactionStatus;
  paymentMethod: LandlordTransactionPaymentMethod;
  paymentDate: string;
  createdAt: string;
  reference?: string;
  description?: string;
  notes?: string;
  tenant?: { _id: string; firstName: string; lastName: string };
  lease?: {
    _id: string;
    property?: { _id: string; name: string };
    unit?: { _id: string; unitNumber: string };
  };
}

/**
 * Mirrors the nested guarantor sub-document on the Lease model. `address`
 * is an OBJECT, not a string — backend stores street/city/state separately.
 * Rendering it directly as a React child crashes ("object with keys {}")
 * when the subdoc exists but its inner fields are undefined.
 */
export interface Guarantor {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  relationship: string;
  occupation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
  };
  idType?: "nin" | "drivers" | "passport" | "voters";
  idNumber?: string;
}

export interface EmergencyContact {
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
}

export interface TenancyAgreement {
  _id: string;
  lease: string;
  property: string | Property;
  unit: string | Unit;
  tenant: string | Tenant;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  documentUrl?: string;
  documentPublicId?: string;
  signedDocumentUrl?: string;
  signedDocumentPublicId?: string;
  status: "draft" | "sent_for_signing" | "signed" | "cancelled";
  signedAt?: string;
  /** Clickwrap signing — set when the tenant typed-name signs in-app. */
  tenantAcknowledged?: boolean;
  tenantAcknowledgedAt?: string;
  signedTypedName?: string;
  signatureImageUrl?: string;
  signatureMethod?: "uploaded" | "drawn";
  /** Landlord signature block (clickwrap, parallel to tenant). */
  landlordSignedAt?: string;
  landlordSignedName?: string;
  landlordSignatureImageUrl?: string;
  landlordSignatureMethod?: "uploaded" | "drawn";
  createdAt: string;
}

// ----- Agreement templates -----
export type AgreementTemplateSource = "text" | "uploaded";

export interface AgreementTemplate {
  _id: string;
  id?: string;
  property:
    | string
    | { _id: string; name: string };
  landlord: string;
  createdBy: string;
  name: string;
  source: AgreementTemplateSource;
  body?: string;
  documentUrl?: string;
  documentFileName?: string;
  documentSize?: number;
  notes?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// ----- Guarantor invitation request -----
export type GuarantorRequestAddressee = "tenant" | "guarantor";
export type GuarantorRequestStatus =
  | "pending"
  | "submitted"
  | "expired"
  | "cancelled";

export interface GuarantorRequest {
  _id: string;
  id?: string;
  lease: string;
  property: string;
  unit: string;
  tenant: string;
  landlord: string;
  requestedBy: string;
  addressee: GuarantorRequestAddressee;
  inviteEmail: string;
  inviteName?: string;
  requirePassport: boolean;
  status: GuarantorRequestStatus;
  submittedAt?: string;
  passportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Quit notice -----
export type QuitNoticeStatus =
  | "draft"
  | "served"
  | "acknowledged"
  | "expired"
  | "withdrawn";

export type QuitNoticeSource = "template" | "uploaded";

export type QuitNoticeReason =
  | "non_payment"
  | "breach_of_terms"
  | "end_of_term"
  | "owner_use"
  | "other";

export const QUIT_NOTICE_REASON_LABELS: Record<QuitNoticeReason, string> = {
  non_payment: "Non-payment of rent",
  breach_of_terms: "Breach of tenancy terms",
  end_of_term: "End of tenancy term",
  owner_use: "Landlord requires the premises for own use",
  other: "Other",
};

export interface QuitNotice {
  _id: string;
  id?: string;
  lease: string;
  property: string | { _id: string; name: string };
  unit: string | { _id: string; unitNumber: string };
  tenant:
    | string
    | { _id: string; firstName: string; lastName: string; email?: string };
  landlord:
    | string
    | { _id: string; firstName: string; lastName: string; email?: string };
  issuedBy: string | { _id: string; firstName: string; lastName: string };
  source: QuitNoticeSource;
  status: QuitNoticeStatus;
  reason: QuitNoticeReason;
  reasonDetail?: string;
  noticePeriodDays: number;
  issuedAt: string;
  servedAt?: string;
  expiresAt: string;
  templateBody?: string;
  documentUrl: string;
  documentFileName?: string;
  documentSize?: number;
  acknowledgedAt?: string;
  withdrawnAt?: string;
  withdrawReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Tenant profile-info request -----
export type TenantProfileField =
  | "avatar"
  | "dateOfBirth"
  | "currentAddress"
  | "nin"
  | "idDocument"
  | "kycSelfie"
  | "occupation";

export const TENANT_PROFILE_FIELD_LABELS: Record<TenantProfileField, string> = {
  avatar: "Profile photo",
  dateOfBirth: "Date of birth",
  currentAddress: "Current address",
  nin: "NIN",
  idDocument: "ID document",
  kycSelfie: "Verification selfie",
  occupation: "Occupation",
};

export type TenantProfileRequestStatus =
  | "pending"
  | "submitted"
  | "expired"
  | "cancelled";

export interface TenantProfileRequest {
  _id: string;
  id?: string;
  lease: string;
  property: string;
  unit: string;
  tenant: string;
  landlord: string;
  requestedBy: string;
  requestedFields: TenantProfileField[];
  message?: string;
  status: TenantProfileRequestStatus;
  submittedAt?: string;
  tokenExpiresAt: string;
  submittedSnapshot?: Partial<Record<TenantProfileField, unknown>>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile fields populated on the tenant's User document — what the
 * landlord's "Tenant profile" card on the lease detail page renders.
 * Mirrors the existing IUser shape; only the requestable fields are
 * exposed here.
 */
export interface TenantProfileSnapshot {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  occupation?: string;
  nin?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  kyc?: {
    status?: KycStatus;
    selfieUrl?: string;
    document?: {
      type?: "nin" | "drivers" | "passport" | "voters";
      number?: string;
      imageUrl?: string;
      uploadedAt?: string;
    };
  };
}

export interface Listing {
  _id: string;
  unit: Unit | string;
  property: Property | string;
  isListed: boolean;
  listedAt?: string;
  reservationCount?: number;
}

export type ReservationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "paid"
  | "cancelled";

export interface ReservationRequest {
  _id: string;
  id?: string;
  unit: Unit | string;
  property: Property | string;
  /** Backend populates this as `tenant`, not `prospect`. */
  tenant: Tenant;
  message?: string;
  status: ReservationStatus;
  reservationFee?: number;
  paidAt?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

/**
 * Backend ChatService.getConversations returns a hand-built object with
 * `id`, `otherParty`, and an optional `listing` / `property` summary —
 * NOT the raw Mongoose doc. Match that shape exactly.
 */
export interface ChatConversation {
  id: string;
  otherParty: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  listing?: {
    id: string;
    unitNumber?: string;
    rentAmount?: number;
    listingTitle?: string;
  } | null;
  property?: {
    id: string;
    name?: string;
    image?: string | null;
  } | null;
  lastMessage?: {
    text: string;
    createdAt: string;
    isOwn: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

/** Backend populates `sender` with a user summary, not a bare id. */
export interface ChatMessage {
  _id: string;
  conversation: string;
  sender:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
      };
  text: string;
  attachments?: Array<{ url: string; type: string; name?: string }>;
  readBy?: string[];
  createdAt: string;
}

export type SharedBillStatus = "open" | "closed" | "settled";

export interface SharedBill {
  _id: string;
  property: string | Property;
  title: string;
  description?: string;
  totalAmount: number;
  status: SharedBillStatus;
  createdBy: Tenant | string;
  shares?: Array<{
    user: Tenant | string;
    amount: number;
    paid: boolean;
    paidAt?: string;
  }>;
  createdAt: string;
}

export type KycStatus =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected";

export interface KycSummary {
  selfieStatus: KycStatus;
  documentStatus: KycStatus;
  overallStatus: KycStatus;
}

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "landlord" | "tenant" | "agent";
  avatar?: string;
}

export type AgentPermissions = {
  canAddTenant?: boolean;
  canRecordPayment?: boolean;
  canRenewLease?: boolean;
  canUploadAgreements?: boolean;
  canManageMaintenance?: boolean;
  canViewPayments?: boolean;
  canViewReports?: boolean;
  canRemoveTenant?: boolean;
};

export type InvitationDirection = "landlord_to_agent" | "agent_to_landlord";

export interface PartySummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface Agent {
  _id: string;
  /** May be null when the invitee hasn't signed up yet. */
  agent: PartySummary | null;
  /** Landlord side of the relationship. Sometimes a string ObjectId, sometimes populated. */
  landlord?: PartySummary | string | null;
  /** Email the invitation was addressed to (lowercased). */
  inviteEmail?: string;
  status: "pending" | "accepted" | "rejected" | "declined" | "revoked";
  direction?: InvitationDirection;
  isActive: boolean;
  permissions: AgentPermissions;
  assignedProperties?: string[];
  properties?: Array<{ _id: string; name?: string; address?: Address } | string>;
  createdAt: string;
}

export interface InvitationDetail {
  id: string;
  direction: InvitationDirection;
  status: "pending" | "accepted" | "rejected";
  inviteEmail: string;
  invitedAt: string;
  acceptedAt?: string;
  isActive: boolean;
  permissions: AgentPermissions;
  properties: Array<{ _id: string; name?: string; address?: Address } | string>;
  landlord: PartySummary | string | null;
  agent: PartySummary | string | null;
  invitedBy: PartySummary | string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ----- Reports (mirror backend/src/services/ReportsService.ts shapes) -----

export type ReportPeriod =
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year";

export interface MonthlyBucket {
  monthKey: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTotal {
  key: string;
  label: string;
  amount: number;
}

export interface ReportSummary {
  period: { from: string; to: string; label: string };
  income: { total: number; byCategory: CategoryTotal[] };
  expense: { total: number; byCategory: CategoryTotal[] };
  netProfit: number;
  monthly: MonthlyBucket[];
  transactionCount: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: {
    walletBalance: number;
    rentReceivable: number;
    propertyValueTotal: number;
    total: number;
  };
  liabilities: {
    depositsHeld: number;
    pendingPayouts: number;
    total: number;
  };
  equity: number;
  meta: {
    propertyCount: number;
    propertiesWithValue: number;
    openInvoiceCount: number;
  };
}

export interface CashFlowMonth {
  monthKey: string;
  monthLabel: string;
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
}

export interface CashFlow {
  period: { from: string; to: string; label: string };
  totals: { inflow: number; outflow: number; net: number };
  monthly: CashFlowMonth[];
}

// ----- Endpoint helpers -----

/** Backend returns either a bare array or { items, total } depending on route. */
function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "items" in data) {
    return ((data as { items: T[] }).items) ?? [];
  }
  return [];
}

export interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  bonusDaysPerSide: number;
  totalReferred: number;
  totalPaid: number;
  totalPending: number;
  totalBonusDaysEarned: number;
}

export const landlordApi = {
  // Referrals
  async getMyReferral(): Promise<ReferralStats> {
    const res = await api.get("/referrals/me");
    return unwrap(res.data) as ReferralStats;
  },
  // Dashboard
  async dashboardStats(): Promise<DashboardStats> {
    const res = await api.get("/dashboard/stats");
    return unwrap(res.data) as DashboardStats;
  },
  async recentActivities(limit = 5): Promise<RecentActivity[]> {
    const res = await api.get("/dashboard/activities", { params: { limit } });
    return asList<RecentActivity>(unwrap(res.data));
  },

  // Properties
  async listProperties(): Promise<Property[]> {
    const res = await api.get("/properties");
    return asList<Property>(unwrap(res.data));
  },
  async getProperty(id: string): Promise<{ property: Property; units: Unit[] }> {
    const res = await api.get(`/properties/${id}`);
    const data = unwrap(res.data) as
      | { property?: Property; units?: Unit[] }
      | (Property & { units?: Unit[] });
    // Two shapes seen in the wild:
    //   1) { property: {...}, units: [...] } — explicit wrapper
    //   2) { ...propertyFields, units: [...] } — flat (current backend)
    if (data && typeof data === "object" && "property" in data) {
      return {
        property: data.property as Property,
        units: (data.units as Unit[]) ?? [],
      };
    }
    const flat = data as Property & { units?: Unit[] };
    return {
      property: flat as Property,
      units: (flat.units as Unit[]) ?? [],
    };
  },
  async createProperty(body: {
    name: string;
    description?: string;
    address: Address;
    propertyType: PropertyType;
    floors: number;
    totalUnits: number;
    amenities?: string[];
    images?: PropertyImage[];
    videos?: string[];
    units?: Array<{
      unitNumber: string;
      bedrooms: number;
      bathrooms: number;
      size?: number;
      rentAmount: number;
      rentPeriod?: RentPeriod;
      defaultFees?: UnitFees;
    }>;
  }): Promise<Property> {
    // Backend expects flat image URLs, not the {url, publicId, isPrimary}
    // shape we use on the client (where isPrimary helps render the first
    // photo prominently). Strip down to URLs at the boundary.
    const payload = {
      ...body,
      images: body.images?.map((i) => i.url),
    };
    const res = await api.post("/properties", payload);
    const data = unwrap(res.data);
    return ((data as { property?: Property }).property ?? data) as Property;
  },
  async uploadPropertyImage(file: File): Promise<{ url: string; publicId: string }> {
    const form = new FormData();
    form.append("image", file);
    const res = await api.post("/properties/upload-image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = unwrap(res.data) as { imageUrl?: string; publicId?: string };
    // Fail loud rather than letting undefined propagate into state — the
    // caller then renders `url.split(...)` on undefined and crashes the
    // tree. Server should have returned the upload URL on a 200; if it
    // didn't, that's an upstream bug we want surfaced as a toast.
    if (!data?.imageUrl) {
      throw new Error("Upload succeeded but no image URL was returned");
    }
    return { url: data.imageUrl, publicId: data.publicId ?? "" };
  },
  async uploadPropertyVideo(file: File): Promise<{ url: string; publicId: string }> {
    const form = new FormData();
    form.append("video", file);
    const res = await api.post("/properties/upload-video", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = unwrap(res.data) as { videoUrl?: string; publicId?: string };
    if (!data?.videoUrl) {
      throw new Error("Upload succeeded but no video URL was returned");
    }
    return { url: data.videoUrl, publicId: data.publicId ?? "" };
  },
  async deleteProperty(id: string): Promise<void> {
    await api.delete(`/properties/${id}`);
  },
  /**
   * Patch property fields. Sends only the keys provided. Media arrays
   * (images, videos) replace whatever's on the server, so callers must
   * pass the full desired array — append the new URL when adding, omit
   * a URL when removing.
   */
  async updateProperty(
    id: string,
    patch: {
      name?: string;
      description?: string;
      images?: string[];
      videos?: string[];
      amenities?: string[];
      currentValue?: number;
    }
  ): Promise<Property> {
    const res = await api.put(`/properties/${id}`, patch);
    const data = unwrap(res.data);
    return ((data as { property?: Property }).property ?? data) as Property;
  },

  // Tenants / leases
  async listTenants(): Promise<Array<{
    tenant: TenantSummary;
    property: PropertySummary;
    unit: UnitSummary;
    lease: LeaseSummary | null;
  }>> {
    const res = await api.get("/tenants/occupied-units");
    return asList(unwrap(res.data));
  },
  async getOccupiedUnits(): Promise<Array<{
    tenant: TenantSummary;
    property: PropertySummary;
    unit: UnitSummary;
    lease: LeaseSummary | null;
  }>> {
    const res = await api.get("/tenants/occupied-units");
    return asList(unwrap(res.data));
  },
  async getVacantUnits(propertyId: string): Promise<Unit[]> {
    const res = await api.get(`/tenants/property/${propertyId}/vacant-units`);
    return asList<Unit>(unwrap(res.data));
  },
  async assignTenant(
    unitId: string,
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      leaseStartDate: string;
      leaseEndDate: string;
      rentAmount: number;
      paymentFrequency: PaymentFrequency;
      fees?: UnitFees;
    }
  ): Promise<unknown> {
    const res = await api.post(`/tenants/unit/${unitId}/assign`, body);
    return unwrap(res.data);
  },
  async renewLease(
    leaseId: string,
    body: { newEndDate: string; newRentAmount?: number }
  ): Promise<Lease> {
    const res = await api.post(`/tenants/lease/${leaseId}/renew`, body);
    return unwrap(res.data) as Lease;
  },
  async recordLeasePayment(
    leaseId: string,
    body: {
      amount: number;
      paymentDate: string;
      paymentMethod: "cash" | "bank_transfer" | "paystack" | "other";
      reference?: string;
      notes?: string;
    }
  ): Promise<unknown> {
    const res = await api.post(`/tenants/lease/${leaseId}/payments`, body);
    return unwrap(res.data);
  },
  async leasePayments(leaseId: string): Promise<unknown[]> {
    const res = await api.get(`/tenants/lease/${leaseId}/payments`);
    return asList(unwrap(res.data));
  },
  async setAutoInvoice(
    leaseId: string,
    body: {
      enabled: boolean;
      gracePeriodDays?: number;
      lateFeeType?: LateFeeType;
      lateFeeValue?: number;
    }
  ): Promise<{
    leaseId: string;
    autoGenerateInvoice: boolean;
    nextInvoiceDate?: string;
    gracePeriodDays?: number;
    lateFeeType?: LateFeeType;
    lateFeeValue?: number;
  }> {
    const res = await api.put(`/tenants/lease/${leaseId}/auto-invoice`, body);
    return unwrap(res.data) as {
      leaseId: string;
      autoGenerateInvoice: boolean;
      nextInvoiceDate?: string;
      gracePeriodDays?: number;
      lateFeeType?: LateFeeType;
      lateFeeValue?: number;
    };
  },

  // Invoices
  async listInvoices(): Promise<Invoice[]> {
    const res = await api.get("/invoices");
    return asList<Invoice>(unwrap(res.data));
  },
  async getInvoice(id: string): Promise<Invoice> {
    const res = await api.get(`/invoices/${id}`);
    return unwrap(res.data) as Invoice;
  },
  async createInvoice(body: {
    leaseId: string;
    lineItems: Array<{ description: string; quantity: number; rate: number }>;
    dueDate: string;
    notes?: string;
  }): Promise<Invoice> {
    const res = await api.post("/invoices", body);
    return unwrap(res.data) as Invoice;
  },
  async markInvoicePaid(id: string): Promise<Invoice> {
    const res = await api.post(`/invoices/${id}/paid`);
    return unwrap(res.data) as Invoice;
  },
  async cancelInvoice(id: string): Promise<Invoice> {
    const res = await api.post(`/invoices/${id}/cancel`);
    return unwrap(res.data) as Invoice;
  },
  async sendInvoice(id: string): Promise<Invoice> {
    const res = await api.post(`/invoices/${id}/send`);
    return unwrap(res.data) as Invoice;
  },
  async emailInvoice(id: string): Promise<{ emailedTo: string; pdfUrl: string }> {
    const res = await api.post(`/invoices/${id}/email`);
    return unwrap(res.data) as { emailedTo: string; pdfUrl: string };
  },
  async downloadInvoicePdf(id: string): Promise<{ pdfUrl: string }> {
    const res = await api.get(`/invoices/${id}/pdf`);
    return unwrap(res.data) as { pdfUrl: string };
  },

  // Receipts
  async listReceipts(params?: {
    page?: number;
    limit?: number;
    tenantId?: string;
    propertyId?: string;
  }): Promise<Receipt[]> {
    const res = await api.get("/receipts", { params });
    return asList<Receipt>(unwrap(res.data));
  },
  async getReceipt(id: string): Promise<Receipt> {
    const res = await api.get(`/receipts/${id}`);
    return unwrap(res.data) as Receipt;
  },
  async emailReceipt(id: string): Promise<{ emailedTo: string; pdfUrl: string }> {
    const res = await api.post(`/receipts/${id}/email`);
    return unwrap(res.data) as { emailedTo: string; pdfUrl: string };
  },
  async downloadReceiptPdf(id: string): Promise<{ pdfUrl: string }> {
    const res = await api.get(`/receipts/${id}/pdf`);
    return unwrap(res.data) as { pdfUrl: string };
  },

  // Maintenance
  async listMaintenanceRequests(params?: {
    status?: MaintenanceStatus;
    priority?: MaintenancePriority;
    propertyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MaintenanceRequest[]> {
    const res = await api.get("/maintenance", { params });
    return asList<MaintenanceRequest>(unwrap(res.data));
  },
  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
    const res = await api.get(`/maintenance/${id}`);
    return unwrap(res.data) as MaintenanceRequest;
  },
  async updateMaintenanceRequest(
    id: string,
    body: {
      status?: MaintenanceStatus;
      priority?: MaintenancePriority;
      assignedTo?: string | null;
    }
  ): Promise<MaintenanceRequest> {
    const res = await api.patch(`/maintenance/${id}`, body);
    return unwrap(res.data) as MaintenanceRequest;
  },

  // Wallet
  async wallet(): Promise<WalletSummary> {
    const res = await api.get("/wallet");
    return unwrap(res.data) as WalletSummary;
  },
  async walletTransactions(params?: {
    propertyId?: string;
  }): Promise<WalletTransaction[]> {
    const res = await api.get("/wallet/transactions", { params });
    return asList<WalletTransaction>(unwrap(res.data));
  },
  /**
   * Cross-lease rent / deposit / maintenance payments — what landlords
   * intuitively mean by "transactions". Wallet ledger entries
   * (settlements, payouts) live on walletTransactions() above; the
   * /app/transactions page fetches both and merges them client-side.
   */
  async transactions(params?: {
    from?: string;
    to?: string;
    propertyId?: string;
    status?: LandlordTransactionStatus;
    type?: LandlordTransactionType;
    limit?: number;
  }): Promise<LandlordTransaction[]> {
    const res = await api.get("/tenants/transactions", { params });
    return asList<LandlordTransaction>(unwrap(res.data));
  },

  // Bank accounts
  async listBanks(): Promise<Bank[]> {
    const res = await api.get("/bank-accounts/banks");
    return asList<Bank>(unwrap(res.data));
  },
  async verifyBank(body: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{ accountName: string; accountNumber: string }> {
    const res = await api.post("/bank-accounts/verify", body);
    return unwrap(res.data) as { accountName: string; accountNumber: string };
  },
  async listBankAccounts(): Promise<BankAccount[]> {
    const res = await api.get("/bank-accounts");
    return asList<BankAccount>(unwrap(res.data));
  },
  async addBankAccount(body: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
    accountName: string;
  }): Promise<BankAccount> {
    const res = await api.post("/bank-accounts", body);
    return unwrap(res.data) as BankAccount;
  },
  async setPrimaryBankAccount(id: string): Promise<BankAccount> {
    const res = await api.post(`/bank-accounts/${id}/primary`);
    return unwrap(res.data) as BankAccount;
  },
  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/bank-accounts/${id}`);
  },

  // Payouts
  async listPayouts(): Promise<Payout[]> {
    const res = await api.get("/payouts");
    return asList<Payout>(unwrap(res.data));
  },
  async requestPayout(body: {
    amount: number;
    bankAccountId: string;
  }): Promise<Payout> {
    const res = await api.post("/payouts", body);
    return unwrap(res.data) as Payout;
  },

  // Agents (landlord -> PM)
  async listAgents(): Promise<Agent[]> {
    const res = await api.get("/agents");
    return asList<Agent>(unwrap(res.data));
  },
  async getAgent(id: string): Promise<Agent> {
    const res = await api.get(`/agents/${id}`);
    return unwrap(res.data) as Agent;
  },
  async inviteAgent(body: {
    email: string;
    permissions?: AgentPermissions;
    propertyIds?: string[];
  }): Promise<InvitationDetail> {
    const res = await api.post("/agents/invite", body);
    return unwrap(res.data) as InvitationDetail;
  },
  async updateAgentStatus(id: string, isActive: boolean): Promise<Agent> {
    const res = await api.patch(`/agents/${id}/status`, { isActive });
    return unwrap(res.data) as Agent;
  },

  // Landlords (PM -> landlord)
  async listMyLandlords(): Promise<Agent[]> {
    const res = await api.get("/agents/my/landlords");
    return asList<Agent>(unwrap(res.data));
  },
  async inviteLandlord(body: { email: string }): Promise<InvitationDetail> {
    const res = await api.post("/agents/invite", body);
    return unwrap(res.data) as InvitationDetail;
  },

  // Invitations (bidirectional)
  async getInvitation(id: string): Promise<InvitationDetail> {
    const res = await api.get(`/agents/invitations/${id}`);
    return unwrap(res.data) as InvitationDetail;
  },
  async acceptInvitation(
    id: string,
    body?: { propertyIds?: string[]; permissions?: AgentPermissions }
  ): Promise<InvitationDetail> {
    const res = await api.post(`/agents/invitations/${id}/accept`, body ?? {});
    return unwrap(res.data) as InvitationDetail;
  },
  async declineInvitation(id: string): Promise<InvitationDetail> {
    const res = await api.post(`/agents/invitations/${id}/reject`);
    return unwrap(res.data) as InvitationDetail;
  },
  async myAgentInvitations(): Promise<InvitationDetail[]> {
    const res = await api.get("/agents/my/invitations");
    return asList<InvitationDetail>(unwrap(res.data));
  },
  async myLandlordInvitations(): Promise<InvitationDetail[]> {
    const res = await api.get("/agents/my/landlord-invitations");
    return asList<InvitationDetail>(unwrap(res.data));
  },

  // Guarantor + emergency contacts (per lease)
  async getGuarantor(leaseId: string): Promise<Guarantor | null> {
    try {
      const res = await api.get(`/tenants/lease/${leaseId}/guarantor`);
      return unwrap(res.data) as Guarantor;
    } catch {
      return null;
    }
  },
  async setGuarantor(leaseId: string, body: Guarantor): Promise<Guarantor> {
    const res = await api.put(`/tenants/lease/${leaseId}/guarantor`, body);
    return unwrap(res.data) as Guarantor;
  },
  async getEmergencyContacts(leaseId: string): Promise<EmergencyContact[]> {
    try {
      const res = await api.get(`/tenants/lease/${leaseId}/emergency-contacts`);
      return asList<EmergencyContact>(unwrap(res.data));
    } catch {
      return [];
    }
  },
  async addEmergencyContact(
    leaseId: string,
    body: EmergencyContact
  ): Promise<EmergencyContact[]> {
    const res = await api.post(`/tenants/lease/${leaseId}/emergency-contacts`, body);
    return asList<EmergencyContact>(unwrap(res.data));
  },

  // Tenancy agreements
  async agreementsByLease(leaseId: string): Promise<TenancyAgreement[]> {
    const res = await api.get(`/tenancy-agreements/lease/${leaseId}`);
    return asList<TenancyAgreement>(unwrap(res.data));
  },
  async agreementsByProperty(propertyId: string): Promise<TenancyAgreement[]> {
    const res = await api.get(`/tenancy-agreements/property/${propertyId}`);
    return asList<TenancyAgreement>(unwrap(res.data));
  },
  async getAgreement(id: string): Promise<TenancyAgreement> {
    const res = await api.get(`/tenancy-agreements/${id}`);
    return unwrap(res.data) as TenancyAgreement;
  },
  /**
   * Landlord signs an agreement (clickwrap, mirror of the tenant flow).
   * Optional signature image attaches via multipart.
   */
  async landlordSignAgreement(
    id: string,
    body: {
      typedName: string;
      documentHash: string;
      signatureImage?: Blob | null;
      signatureMethod?: "uploaded" | "drawn";
    }
  ): Promise<TenancyAgreement> {
    if (body.signatureImage) {
      const form = new FormData();
      form.append("typedName", body.typedName);
      form.append("documentHash", body.documentHash);
      if (body.signatureMethod) {
        form.append("signatureMethod", body.signatureMethod);
      }
      form.append(
        "signatureImage",
        body.signatureImage,
        body.signatureMethod === "drawn" ? "signature.png" : "signature"
      );
      const res = await api.post(
        `/tenancy-agreements/${id}/landlord-sign`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return unwrap(res.data) as TenancyAgreement;
    }
    const res = await api.post(`/tenancy-agreements/${id}/landlord-sign`, {
      typedName: body.typedName,
      documentHash: body.documentHash,
    });
    return unwrap(res.data) as TenancyAgreement;
  },
  async uploadAgreement(
    leaseId: string,
    file: File
  ): Promise<TenancyAgreement> {
    const form = new FormData();
    form.append("document", file);
    const res = await api.post(
      `/tenancy-agreements/lease/${leaseId}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrap(res.data) as TenancyAgreement;
  },

  // Quit notices
  async listQuitNotices(leaseId?: string): Promise<QuitNotice[]> {
    const res = await api.get("/quit-notices", {
      params: leaseId ? { leaseId } : undefined,
    });
    return asList<QuitNotice>(unwrap(res.data));
  },
  async getQuitNotice(id: string): Promise<QuitNotice> {
    const res = await api.get(`/quit-notices/${id}`);
    return unwrap(res.data) as QuitNotice;
  },
  async issueQuitNoticeFromTemplate(body: {
    leaseId: string;
    reason: QuitNoticeReason;
    reasonDetail?: string;
    noticePeriodDays?: number;
    body: string;
  }): Promise<QuitNotice> {
    const res = await api.post("/quit-notices", body);
    return unwrap(res.data) as QuitNotice;
  },
  async issueQuitNoticeFromUpload(
    leaseId: string,
    file: File,
    meta: {
      reason: QuitNoticeReason;
      reasonDetail?: string;
      noticePeriodDays?: number;
    }
  ): Promise<QuitNotice> {
    const form = new FormData();
    form.append("document", file);
    form.append("leaseId", leaseId);
    form.append("reason", meta.reason);
    if (meta.reasonDetail) form.append("reasonDetail", meta.reasonDetail);
    if (meta.noticePeriodDays != null)
      form.append("noticePeriodDays", String(meta.noticePeriodDays));
    const res = await api.post("/quit-notices/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data) as QuitNotice;
  },
  async withdrawQuitNotice(
    id: string,
    reason?: string
  ): Promise<QuitNotice> {
    const res = await api.post(`/quit-notices/${id}/withdraw`, { reason });
    return unwrap(res.data) as QuitNotice;
  },

  // Guarantor requests (invite a tenant or guarantor to fill the form)
  async createGuarantorRequest(body: {
    leaseId: string;
    addressee: GuarantorRequestAddressee;
    inviteEmail: string;
    inviteName?: string;
    requirePassport?: boolean;
  }): Promise<GuarantorRequest> {
    const res = await api.post("/guarantor-requests", body);
    return unwrap(res.data) as GuarantorRequest;
  },
  async listGuarantorRequests(leaseId: string): Promise<GuarantorRequest[]> {
    const res = await api.get(`/guarantor-requests/by-lease/${leaseId}`);
    return asList<GuarantorRequest>(unwrap(res.data));
  },
  async cancelGuarantorRequest(id: string): Promise<GuarantorRequest> {
    const res = await api.post(`/guarantor-requests/${id}/cancel`);
    return unwrap(res.data) as GuarantorRequest;
  },

  // Tenant profile-info requests
  async getTenantProfileForLease(
    leaseId: string
  ): Promise<TenantProfileSnapshot> {
    const res = await api.get(`/tenants/lease/${leaseId}/tenant-profile`);
    return unwrap(res.data) as TenantProfileSnapshot;
  },
  async createTenantProfileRequest(body: {
    leaseId: string;
    fields: TenantProfileField[];
    message?: string;
  }): Promise<TenantProfileRequest> {
    const res = await api.post("/tenant-profile-requests", body);
    return unwrap(res.data) as TenantProfileRequest;
  },
  async listTenantProfileRequests(
    leaseId: string
  ): Promise<TenantProfileRequest[]> {
    const res = await api.get(`/tenant-profile-requests/by-lease/${leaseId}`);
    return asList<TenantProfileRequest>(unwrap(res.data));
  },
  async cancelTenantProfileRequest(
    id: string
  ): Promise<TenantProfileRequest> {
    const res = await api.post(`/tenant-profile-requests/${id}/cancel`);
    return unwrap(res.data) as TenantProfileRequest;
  },
  /**
   * Landlord fills the tenant's profile on their behalf. Multipart so
   * avatar / kycSelfie / idDocument can be attached. Backend accepts any
   * subset of the fields — partial updates are fine.
   */
  async fillTenantProfile(
    leaseId: string,
    payload: FormData
  ): Promise<TenantProfileSnapshot> {
    const res = await api.put(
      `/tenants/lease/${leaseId}/tenant-profile`,
      payload,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrap(res.data) as TenantProfileSnapshot;
  },

  // Agreement templates
  async listAgreementTemplates(
    propertyId?: string
  ): Promise<AgreementTemplate[]> {
    const res = await api.get("/agreement-templates", {
      params: propertyId ? { propertyId } : undefined,
    });
    return asList<AgreementTemplate>(unwrap(res.data));
  },
  async getAgreementTemplate(id: string): Promise<AgreementTemplate> {
    const res = await api.get(`/agreement-templates/${id}`);
    return unwrap(res.data) as AgreementTemplate;
  },
  async createTextAgreementTemplate(body: {
    propertyId: string;
    name: string;
    body: string;
    notes?: string;
  }): Promise<AgreementTemplate> {
    const res = await api.post("/agreement-templates", body);
    return unwrap(res.data) as AgreementTemplate;
  },
  async uploadAgreementTemplate(
    propertyId: string,
    name: string,
    file: File,
    notes?: string
  ): Promise<AgreementTemplate> {
    const form = new FormData();
    form.append("document", file);
    form.append("propertyId", propertyId);
    form.append("name", name);
    if (notes) form.append("notes", notes);
    const res = await api.post("/agreement-templates/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data) as AgreementTemplate;
  },
  async updateTextAgreementTemplate(
    id: string,
    body: { name?: string; body?: string; notes?: string }
  ): Promise<AgreementTemplate> {
    const res = await api.put(`/agreement-templates/${id}`, body);
    return unwrap(res.data) as AgreementTemplate;
  },
  async deleteAgreementTemplate(id: string): Promise<void> {
    await api.delete(`/agreement-templates/${id}`);
  },
  async sendAgreementTemplateToTenant(
    id: string,
    leaseId: string
  ): Promise<TenancyAgreement> {
    const res = await api.post(`/agreement-templates/${id}/send`, { leaseId });
    return unwrap(res.data) as TenancyAgreement;
  },
  async aiGenerateAgreement(body: {
    propertyType?: string;
    rentNgn?: number;
    paymentFrequency?: "monthly" | "quarterly" | "annually";
    jurisdiction?: string;
    specialClauses?: string;
  }): Promise<{ body: string }> {
    // Claude can take 15–30s to draft a 4k-token agreement; default
    // 20s axios timeout would silently kill the request.
    const res = await api.post("/agreement-templates/ai/generate", body, {
      timeout: 120_000,
    });
    return unwrap(res.data) as { body: string };
  },
  async aiRefineAgreement(body: {
    body: string;
    instructions?: string;
  }): Promise<{ body: string }> {
    const res = await api.post("/agreement-templates/ai/refine", body, {
      timeout: 120_000,
    });
    return unwrap(res.data) as { body: string };
  },

  // Marketplace seller
  async myListings(): Promise<Listing[]> {
    const res = await api.get("/listings/my-listings");
    return asList<Listing>(unwrap(res.data));
  },
  async listUnit(
    unitId: string,
    body?: { description?: string; visibility?: "public" | "unlisted" }
  ): Promise<Listing> {
    const res = await api.post(`/listings/${unitId}/list`, body ?? {});
    return unwrap(res.data) as Listing;
  },
  async unlistUnit(unitId: string): Promise<Listing> {
    const res = await api.delete(`/listings/${unitId}/list`);
    return unwrap(res.data) as Listing;
  },
  async landlordReservationRequests(): Promise<ReservationRequest[]> {
    const res = await api.get("/reservations/landlord-requests");
    return asList<ReservationRequest>(unwrap(res.data));
  },
  async approveReservation(id: string): Promise<ReservationRequest> {
    const res = await api.post(`/reservations/${id}/approve`);
    return unwrap(res.data) as ReservationRequest;
  },
  async declineReservation(
    id: string,
    reason?: string
  ): Promise<ReservationRequest> {
    const res = await api.post(`/reservations/${id}/decline`, { reason });
    return unwrap(res.data) as ReservationRequest;
  },

  // Notifications
  async notifications(): Promise<Notification[]> {
    const res = await api.get("/notifications");
    return asList<Notification>(unwrap(res.data));
  },
  async unreadNotificationCount(): Promise<number> {
    const res = await api.get("/notifications/unread-count");
    const data = unwrap(res.data) as { count?: number } | number;
    return typeof data === "number" ? data : data?.count ?? 0;
  },
  async markNotificationRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },
  async markAllNotificationsRead(): Promise<void> {
    await api.patch("/notifications/read-all");
  },

  // Chat
  async chatConversations(): Promise<ChatConversation[]> {
    const res = await api.get("/chat/conversations");
    return asList<ChatConversation>(unwrap(res.data));
  },
  async chatMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`);
    return asList<ChatMessage>(unwrap(res.data));
  },
  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const res = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      { text }
    );
    return unwrap(res.data) as ChatMessage;
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await api.patch(`/chat/conversations/${conversationId}/read`);
  },
  async unreadChatCount(): Promise<number> {
    const res = await api.get("/chat/unread-count");
    const data = unwrap(res.data) as { count?: number } | number;
    return typeof data === "number" ? data : data?.count ?? 0;
  },

  // Building community (landlord can view but not create bills)
  async sharedBillsForProperty(propertyId: string): Promise<SharedBill[]> {
    const res = await api.get(`/shared-bills/property/${propertyId}`);
    return asList<SharedBill>(unwrap(res.data));
  },
  async getSharedBill(id: string): Promise<SharedBill> {
    const res = await api.get(`/shared-bills/${id}`);
    return unwrap(res.data) as SharedBill;
  },

  // Profile + auth
  async profile(): Promise<UserProfile> {
    const res = await api.get("/auth/profile");
    return unwrap(res.data) as UserProfile;
  },
  async updateProfile(body: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
  }>): Promise<UserProfile> {
    const res = await api.put("/auth/profile", body);
    return unwrap(res.data) as UserProfile;
  },
  async changePassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await api.post("/auth/change-password", body);
  },

  // Reports
  async getReportSummary(params: {
    period?: ReportPeriod;
    from?: string;
    to?: string;
    propertyId?: string;
  }): Promise<ReportSummary> {
    const res = await api.get("/reports/summary", { params });
    return unwrap(res.data) as ReportSummary;
  },
  async getBalanceSheet(): Promise<BalanceSheet> {
    const res = await api.get("/reports/balance-sheet");
    return unwrap(res.data) as BalanceSheet;
  },
  async getCashFlow(params: {
    period?: ReportPeriod;
    from?: string;
    to?: string;
    propertyId?: string;
  }): Promise<CashFlow> {
    const res = await api.get("/reports/cash-flow", { params });
    return unwrap(res.data) as CashFlow;
  },
  async downloadReportSummary(
    format: "csv" | "pdf",
    params: {
      period?: ReportPeriod;
      from?: string;
      to?: string;
      propertyId?: string;
    }
  ): Promise<Blob> {
    const res = await api.get(`/reports/summary.${format}`, {
      params,
      responseType: "blob",
    });
    return res.data as Blob;
  },

  // KYC
  async kycStatus(): Promise<KycSummary> {
    const res = await api.get("/kyc/status");
    return unwrap(res.data) as KycSummary;
  },
  async uploadKycSelfie(file: File): Promise<KycSummary> {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/kyc/selfie", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data) as KycSummary;
  },
  async uploadKycDocument(
    file: File,
    type: string,
    documentNumber: string
  ): Promise<KycSummary> {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    form.append("documentNumber", documentNumber);
    const res = await api.post("/kyc/document", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data) as KycSummary;
  },
};
