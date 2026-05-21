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
    lease: Lease | null;
  }>> {
    const res = await api.get("/tenants/occupied-units");
    return asList(unwrap(res.data));
  },
  async getOccupiedUnits(): Promise<Array<{
    tenant: Tenant;
    property: Property;
    unit: Unit;
    lease: Lease | null;
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
  async inviteAgent(body: {
    email: string;
    permissions: Agent["permissions"];
    propertyIds?: string[];
  }): Promise<Agent> {
    const res = await api.post("/agents/invite", body);
    return unwrap(res.data) as Agent;
  },
};
