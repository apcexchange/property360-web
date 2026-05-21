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

export type PropertyType = "apartment" | "house" | "commercial" | "land" | "bungalow";

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
  createdAt: string;
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

export interface LeasePayment {
  _id: string;
  lease: string;
  amount: number;
  paymentDate: string;
  method: LeasePaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Guarantor {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  relationship: string;
  address?: string;
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
  status: "draft" | "sent_for_signing" | "signed" | "cancelled";
  signingProvider?: "docuseal";
  signingId?: string;
  signedAt?: string;
  createdAt: string;
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

export interface Agent {
  _id: string;
  agent: Tenant; // shaped like a user; reused tenant type for firstName/etc.
  landlord: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  isActive: boolean;
  permissions: {
    canAddTenant?: boolean;
    canRecordPayment?: boolean;
    canRenewLease?: boolean;
    canUploadAgreements?: boolean;
    canManageMaintenance?: boolean;
    canViewPayments?: boolean;
    canViewReports?: boolean;
    canRemoveTenant?: boolean;
  };
  assignedProperties?: string[];
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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

export const landlordApi = {
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
    const data = unwrap(res.data) as { property?: Property; units?: Unit[] } | Property;
    if (data && typeof data === "object" && "property" in data) {
      return {
        property: data.property as Property,
        units: (data.units as Unit[]) ?? [],
      };
    }
    return { property: data as Property, units: [] };
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
    const res = await api.post("/properties", body);
    const data = unwrap(res.data);
    return ((data as { property?: Property }).property ?? data) as Property;
  },

  // Tenants / leases
  async listTenants(): Promise<Array<{
    tenant: Tenant;
    property: Property;
    unit: Unit;
    lease: LeaseSummary | null;
  }>> {
    const res = await api.get("/tenants/occupied-units");
    return asList(unwrap(res.data));
  },
  async getOccupiedUnits(): Promise<Array<{
    tenant: Tenant;
    property: Property;
    unit: Unit;
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
      method: "cash" | "bank_transfer" | "paystack" | "other";
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

  // Wallet
  async wallet(): Promise<WalletSummary> {
    const res = await api.get("/wallet");
    return unwrap(res.data) as WalletSummary;
  },
  async walletTransactions(): Promise<WalletTransaction[]> {
    const res = await api.get("/wallet/transactions");
    return asList<WalletTransaction>(unwrap(res.data));
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

  // Agents
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
    permissions: Agent["permissions"];
    propertyIds?: string[];
  }): Promise<Agent> {
    const res = await api.post("/agents/invite", body);
    return unwrap(res.data) as Agent;
  },
  async updateAgentStatus(id: string, isActive: boolean): Promise<Agent> {
    const res = await api.patch(`/agents/${id}/status`, { isActive });
    return unwrap(res.data) as Agent;
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
  async uploadAgreement(
    leaseId: string,
    file: File
  ): Promise<TenancyAgreement> {
    const form = new FormData();
    form.append("file", file);
    form.append("leaseId", leaseId);
    const res = await api.post("/tenancy-agreements", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res.data) as TenancyAgreement;
  },
  async sendAgreementForSigning(id: string): Promise<TenancyAgreement> {
    const res = await api.post(`/tenancy-agreements/${id}/send-for-signing`);
    return unwrap(res.data) as TenancyAgreement;
  },
  async getAgreementSigningLink(
    id: string
  ): Promise<{ url: string }> {
    const res = await api.get(`/tenancy-agreements/${id}/signing-link`);
    return unwrap(res.data) as { url: string };
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
