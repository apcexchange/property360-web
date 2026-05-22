"use client";

import { api, unwrap } from "./api";

// ----- Types (mirror backend response shapes; aligned with mobile/src/services/tenantDashboard.ts) -----

export interface TenantLeaseInfo {
  lease: {
    id: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    paymentFrequency: string;
    status: string;
    securityDeposit: number;
    cautionFee: number;
    agentFee: number;
    agreementFee: number;
    legalFee: number;
    serviceCharge: number;
    otherFee: number;
    otherFeeDescription: string;
  };
  property: {
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
    };
  };
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
  };
  landlord: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface FeeItem {
  label: string;
  amount: number;
  paid: number;
  pending: number;
  outstanding: number;
  type: string;
}

export interface PaymentSummary {
  monthlyRent: number;
  nextDueDate: string | null;
  daysUntilDue: number;
  totalPaid: number;
  outstandingBalance: number;
  rentOutstanding: number;
  rentPaid: number;
  rentPending: number;
  fees: FeeItem[];
  totalFeesDue: number;
  totalFeesPaid: number;
  totalFeesOutstanding: number;
}

export interface Payment {
  _id: string;
  amount: number;
  type: "rent" | "deposit" | "maintenance" | "other";
  status: "pending" | "completed" | "failed" | "voided";
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  description?: string;
  notes?: string;
  createdAt: string;
}

export interface UpcomingPayment {
  dueDate: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  paymentId?: string;
}

export interface MaintenanceRequest {
  _id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  images: string[];
  property?: { name: string };
  unit?: { unitNumber: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceRequestData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  images?: string[];
}

export interface LeaseInvitationProperty {
  id: string;
  name: string;
  address?: { street?: string; city?: string; state?: string };
}

export interface LeaseInvitationUnit {
  id: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
}

export interface LeaseInvitationLandlord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface LeaseInvitation {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentFrequency: string;
  status: string;
  securityDeposit?: number;
  cautionFee?: number;
  agentFee?: number;
  agreementFee?: number;
  legalFee?: number;
  serviceCharge?: number;
  otherFee?: number;
  otherFeeDescription?: string;
  property: LeaseInvitationProperty;
  unit: LeaseInvitationUnit;
  landlord: LeaseInvitationLandlord;
  createdAt?: string;
}

export interface TenantNotification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

/**
 * Backend ChatService.getConversations builds a hand-shaped object —
 * `id`, `otherParty`, and an optional listing/property summary — so
 * mirror that exactly. There is no `participants` array.
 */
export interface Conversation {
  id: string;
  otherParty: ConversationParticipant;
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

export interface Message {
  _id: string;
  conversation: string;
  /** Backend populates `sender` with a user summary, not just an id. */
  sender:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
      };
  text?: string;
  content?: string;
  messageType?: "text" | "image" | "file" | "audio";
  attachments?: Array<{ url: string; type?: string; name?: string }>;
  attachment?: { url: string; type?: string; name?: string };
  readBy?: string[];
  createdAt: string;
}

export interface TenancyAgreement {
  _id: string;
  lease: string;
  property?: { _id?: string; name?: string };
  unit?: { _id?: string; unitNumber?: string };
  fileUrl?: string;
  documentUrl?: string;
  documentPublicId?: string;
  fileSize?: number;
  signedDocumentUrl?: string;
  fileName?: string;
  status: "draft" | "sent_for_signing" | "signed" | "cancelled" | string;
  signingStatus?: "not_sent" | "pending" | "sent" | "opened" | "signed" | "declined";
  signingProvider?: string;
  signedAt?: string;
  acknowledgedAt?: string;
  tenantAcknowledged?: boolean;
  createdAt: string;
}

export interface PayInitResponse {
  authorizationUrl?: string;
  authorization_url?: string;
  reference: string;
  amount?: number;
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

export type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export interface KycSummary {
  selfieStatus: KycStatus;
  documentStatus: KycStatus;
  overallStatus: KycStatus;
}

export type FeeType =
  | "securityDeposit"
  | "cautionFee"
  | "agentFee"
  | "agreementFee"
  | "legalFee"
  | "serviceCharge"
  | "otherFee";

export type OfflinePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "other";

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "items" in data) {
    return ((data as { items: T[] }).items) ?? [];
  }
  return [];
}

// All tenant-app endpoints are mounted at /tenant/* on the backend
// (see backend/src/routes/index.ts), not /tenant-app/* as the spec hint says.
export const tenantApi = {
  // ----- Dashboard -----
  async getDashboard(): Promise<TenantLeaseInfo | null> {
    const res = await api.get("/tenant/dashboard");
    return (unwrap(res.data) as TenantLeaseInfo | null) ?? null;
  },

  // ----- Payments -----
  async getPaymentSummary(): Promise<PaymentSummary> {
    const res = await api.get("/tenant/payments/summary");
    return (unwrap(res.data) as PaymentSummary) ?? null;
  },
  async getUpcomingPayments(): Promise<UpcomingPayment[]> {
    const res = await api.get("/tenant/payments/upcoming");
    return asList<UpcomingPayment>(unwrap(res.data));
  },
  async getPaymentHistory(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const res = await api.get("/tenant/payments", { params });
    return asList<Payment>(unwrap(res.data));
  },

  // ----- Rent (cash + online) -----
  async markRentPaid(body: {
    amount: number;
    paymentMethod: OfflinePaymentMethod;
    notes?: string;
  }): Promise<unknown> {
    const res = await api.post("/tenant/rent/mark-paid", body);
    return unwrap(res.data);
  },

  // ----- Fees (cash + online) -----
  async markFeePaid(body: {
    feeType: FeeType;
    amount: number;
    paymentMethod: OfflinePaymentMethod;
    notes?: string;
  }): Promise<unknown> {
    const res = await api.post("/tenant/fees/mark-paid", body);
    return unwrap(res.data);
  },
  async markAllFeesPaid(
    paymentMethod: OfflinePaymentMethod = "cash"
  ): Promise<unknown> {
    const res = await api.post("/tenant/fees/mark-all-paid", { paymentMethod });
    return unwrap(res.data);
  },
  async payFee(body: {
    feeType: FeeType;
    amount: number;
    callbackUrl?: string;
  }): Promise<PayInitResponse> {
    const res = await api.post("/tenant/fees/pay", body);
    return unwrap(res.data) as PayInitResponse;
  },
  async payAllFees(callbackUrl?: string): Promise<PayInitResponse> {
    const res = await api.post("/tenant/fees/pay-all", { callbackUrl });
    return unwrap(res.data) as PayInitResponse;
  },

  // ----- Online payment for rent (invoice-based) -----
  async initiateInvoicePayment(body: {
    invoiceId: string;
    amount?: number;
    callbackUrl?: string;
  }): Promise<PayInitResponse> {
    const res = await api.post("/tenant/payments/initiate", body);
    return unwrap(res.data) as PayInitResponse;
  },
  async verifyPayment(reference: string): Promise<unknown> {
    const res = await api.get(
      `/tenant/payments/verify/${encodeURIComponent(reference)}`
    );
    return unwrap(res.data);
  },

  // ----- Invitations -----
  async listInvitations(): Promise<LeaseInvitation[]> {
    const res = await api.get("/tenant/invitations");
    return asList<LeaseInvitation>(unwrap(res.data));
  },
  async getInvitation(leaseId: string): Promise<LeaseInvitation | null> {
    const res = await api.get(`/tenant/invitations/${leaseId}`);
    return (unwrap(res.data) as LeaseInvitation | null) ?? null;
  },
  async acceptInvitation(leaseId: string): Promise<void> {
    await api.post(`/tenant/invitations/${leaseId}/accept`);
  },
  async declineInvitation(leaseId: string): Promise<void> {
    await api.post(`/tenant/invitations/${leaseId}/decline`);
  },

  // ----- Maintenance -----
  async listMaintenanceRequests(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<MaintenanceRequest[]> {
    const res = await api.get("/tenant/requests", { params });
    return asList<MaintenanceRequest>(unwrap(res.data));
  },
  async createMaintenanceRequest(
    body: CreateMaintenanceRequestData
  ): Promise<MaintenanceRequest> {
    const res = await api.post("/tenant/requests", body);
    return unwrap(res.data) as MaintenanceRequest;
  },
  async getMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
    const res = await api.get(`/tenant/requests/${id}`);
    return unwrap(res.data) as MaintenanceRequest;
  },
  async cancelMaintenanceRequest(id: string): Promise<void> {
    await api.patch(`/tenant/requests/${id}/cancel`);
  },

  // ----- Marketplace reservations -----
  async createReservation(
    unitId: string,
    message?: string
  ): Promise<{ id: string; _id?: string; status: string }> {
    const res = await api.post(`/reservations/request/${unitId}`, {
      message,
    });
    return unwrap(res.data) as { id: string; _id?: string; status: string };
  },

  // ----- Notifications -----
  async listNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<TenantNotification[]> {
    const res = await api.get("/notifications", { params });
    return asList<TenantNotification>(unwrap(res.data));
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

  // ----- Chat -----
  async listConversations(): Promise<Conversation[]> {
    const res = await api.get("/chat/conversations");
    return asList<Conversation>(unwrap(res.data));
  },
  async listMessages(conversationId: string): Promise<Message[]> {
    const res = await api.get(
      `/chat/conversations/${conversationId}/messages`,
      { params: { limit: 50 } }
    );
    return asList<Message>(unwrap(res.data));
  },
  async sendMessage(
    conversationId: string,
    text: string
  ): Promise<Message> {
    const res = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      { text }
    );
    return unwrap(res.data) as Message;
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await api.patch(`/chat/conversations/${conversationId}/read`);
  },

  // ----- Tenancy agreement -----
  async listAgreementsByLease(leaseId: string): Promise<TenancyAgreement[]> {
    const res = await api.get(`/tenancy-agreements/lease/${leaseId}`);
    return asList<TenancyAgreement>(unwrap(res.data));
  },
  async getAgreement(id: string): Promise<TenancyAgreement> {
    const res = await api.get(`/tenancy-agreements/${id}`);
    return unwrap(res.data) as TenancyAgreement;
  },
  async getAgreementSigningLink(id: string): Promise<{ url: string }> {
    const res = await api.get(`/tenancy-agreements/${id}/signing-link`);
    return unwrap(res.data) as { url: string };
  },
  /**
   * Clickwrap sign. The backend requires a `documentHash` fingerprint of
   * the file the tenant just reviewed so a signed record is verifiable.
   * We use the same shape mobile uses: `${_id}|${documentPublicId}|${fileSize}`.
   */
  async acknowledgeAgreement(
    id: string,
    body: { typedName: string; documentHash: string }
  ): Promise<TenancyAgreement> {
    const res = await api.post(`/tenancy-agreements/${id}/acknowledge`, body);
    return unwrap(res.data) as TenancyAgreement;
  },

  // ----- Profile + auth -----
  async profile(): Promise<UserProfile> {
    const res = await api.get("/auth/profile");
    return unwrap(res.data) as UserProfile;
  },
  async updateProfile(
    body: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      avatar: string;
    }>
  ): Promise<UserProfile> {
    const res = await api.put("/auth/profile", body);
    return unwrap(res.data) as UserProfile;
  },
  async changePassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await api.post("/auth/change-password", body);
  },

  // ----- KYC -----
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

export const FEE_LABEL: Record<FeeType, string> = {
  securityDeposit: "Security deposit",
  cautionFee: "Caution fee",
  agentFee: "Agent fee",
  agreementFee: "Agreement fee",
  legalFee: "Legal fee",
  serviceCharge: "Service charge",
  otherFee: "Other fee",
};

export function daysUntilDueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
