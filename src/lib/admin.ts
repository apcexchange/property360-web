import { api, unwrap, ApiEnvelope } from "./api";
import { AdminUser, session } from "./session";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// All fields are optional because the API may omit any of them when the
// underlying collection is empty or the rollup hasn't computed yet.
export interface Stats {
  landlordCount?: number;
  tenantCount?: number;
  agentCount?: number;
  propertyCount?: number;
  unitCount?: number;
  occupiedUnitCount?: number;
  occupancyRate?: number;
  activeLeaseCount?: number;
  pendingKycCount?: number;
  pendingReportCount?: number;
  pendingDeletionCount?: number;
  rentCollected30d?: number;
  rentCollectedPrev30d?: number;
  payoutsCompleted30d?: number;
}

export interface AdminLeaseRow {
  _id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentFrequency: string;
  createdAt: string;
  property?: { _id: string; name?: string; address?: { city?: string; state?: string } };
  unit?: { _id: string; unitNumber?: string };
  tenant?: { _id: string; firstName?: string; lastName?: string; email?: string };
  landlord?: { _id: string; firstName?: string; lastName?: string; email?: string };
}

export interface AdminLeaseDetail {
  lease: AdminLeaseRow & {
    securityDeposit?: number;
    cautionFee?: number;
    agentFee?: number;
    agreementFee?: number;
    legalFee?: number;
    serviceCharge?: number;
    otherFee?: number;
    gracePeriodDays?: number;
    lateFeeType?: string;
    lateFeeValue?: number;
    autoGenerateInvoice?: boolean;
  };
  transactions: AdminTransactionRow[];
}

export interface AdminPayoutRow {
  _id: string;
  amount: number;
  netAmount: number;
  fee: number;
  status: string;
  reference: string;
  requestedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  landlord?: { _id: string; firstName?: string; lastName?: string; email?: string };
  bankAccount?: { _id: string; bankName?: string; accountNumber?: string; accountName?: string };
}

export interface AdminUserDetail {
  user: AdminUserRow & {
    address?: { street?: string; city?: string; state?: string };
    avatar?: string;
    kyc?: {
      status?: string;
      rejectionReason?: string;
      verifiedAt?: string;
      document?: { type?: string; uploadedAt?: string; imageUrl?: string };
      selfieUrl?: string;
    };
  };
  stats: {
    propertyCount: number;
    leaseCount: number;
    transactionCount: number;
    totalPaidOut: number;
  };
  wallet: {
    _id: string;
    balance: number;
    totalEarnings: number;
    totalWithdrawn: number;
    pendingBalance: number;
  } | null;
  leases: AdminLeaseRow[];
  transactions: AdminTransactionRow[];
}

export interface FinancialReport {
  rangeDays: number;
  revenueSeries: { date: string; total: number }[];
  topLandlords: {
    landlordId: string;
    landlordName: string;
    email?: string;
    total: number;
    count: number;
  }[];
  statusBreakdown: { _id: string; count: number; total: number }[];
  totals: {
    revenue: number;
    revenueCount: number;
    payouts: number;
    payoutsCount: number;
  };
}

export interface AdminListingRow {
  _id: string;
  unitNumber: string;
  rentAmount: number;
  bedrooms?: number;
  bathrooms?: number;
  listingTitle?: string;
  listingStatus: "active" | "inactive" | "reserved";
  listedAt?: string;
  inspectionFee?: number;
  inspectionFeeEnabled?: boolean;
  preferredTenantType?: string;
  isNegotiable?: boolean;
  property?: {
    _id: string;
    name?: string;
    address?: { city?: string; state?: string };
    landlord?: { _id: string; firstName?: string; lastName?: string; email?: string };
  };
}

export interface AdminReservationRow {
  _id: string;
  status: "pending" | "approved" | "declined" | "paid" | "expired" | "cancelled";
  message?: string;
  declineReason?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  expiresAt?: string;
  paymentType?: "inspection" | "full";
  paymentAmount?: number;
  tenant?: { _id: string; firstName?: string; lastName?: string; email?: string };
  landlord?: { _id: string; firstName?: string; lastName?: string; email?: string };
  property?: { _id: string; name?: string };
  unit?: { _id: string; unitNumber?: string; rentAmount?: number };
}

export interface AdminAuditRow {
  _id: string;
  action: string;
  actor?: { _id: string; firstName?: string; lastName?: string; email?: string };
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDeletionRequestRow {
  _id: string;
  email: string;
  phone?: string;
  reason?: string;
  status: "pending" | "verified" | "completed" | "rejected";
  notes?: string;
  ipAddress?: string;
  createdAt: string;
  reviewedAt?: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

export type ReportAction = "message_deleted" | "user_warned" | "user_suspended" | "dismissed";

export interface AdminReportRow {
  _id: string;
  context: "building_chat" | "direct_chat";
  message: string;
  messageSnapshot?: string;
  reason: string;
  detail?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
  reporter?: { _id: string; firstName?: string; lastName?: string; email?: string };
  reportedUser?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    isActive?: boolean;
  };
  building?: { _id: string; name?: string };
  reviewAction?: ReportAction;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface AdminUserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  kyc?: { status?: string };
  createdAt: string;
}

export interface AdminPropertyRow {
  _id: string;
  name: string;
  address?: { city?: string; state?: string };
  landlord?: { firstName?: string; lastName?: string; email?: string };
  units?: number;
  createdAt: string;
}

export interface AdminTransactionRow {
  _id: string;
  amount: number;
  type: string;
  status: string;
  paymentDate?: string;
  createdAt: string;
  paymentMethod?: string;
  tenant?: { firstName?: string; lastName?: string };
  lease?: { property?: { name?: string } };
}

export interface AdminKycRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  kyc?: {
    status?: string;
    document?: { type?: string; uploadedAt?: string; imageUrl?: string };
    selfieUrl?: string;
  };
  createdAt: string;
}

const adminApi = {
  async login(email: string, password: string): Promise<AdminUser> {
    const res = await api.post<ApiEnvelope<{ user: AdminUser; accessToken: string }>>(
      "/auth/login",
      { identifier: email, password }
    );
    const { user, accessToken } = unwrap(res.data);
    if (user.role !== "admin") {
      throw new Error("This account does not have admin access.");
    }
    session.set(accessToken, user);
    return user;
  },

  async me(): Promise<AdminUser> {
    const res = await api.get<ApiEnvelope<AdminUser>>("/admin/me");
    return unwrap(res.data);
  },

  async getStats(): Promise<Stats> {
    const res = await api.get<ApiEnvelope<Stats>>("/admin/stats");
    return unwrap(res.data);
  },

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    kyc?: string;
  }): Promise<Paginated<AdminUserRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminUserRow>>>("/admin/users", { params });
    return unwrap(res.data);
  },

  async listProperties(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Paginated<AdminPropertyRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminPropertyRow>>>("/admin/properties", { params });
    return unwrap(res.data);
  },

  async listTransactions(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<Paginated<AdminTransactionRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminTransactionRow>>>("/admin/transactions", { params });
    return unwrap(res.data);
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const res = await api.get<ApiEnvelope<AdminUserDetail>>(`/admin/users/${userId}`);
    return unwrap(res.data);
  },

  async suspendUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/suspend`);
  },

  async activateUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/activate`);
  },

  async listLeases(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<Paginated<AdminLeaseRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminLeaseRow>>>("/admin/leases", { params });
    return unwrap(res.data);
  },

  async getLeaseDetail(leaseId: string): Promise<AdminLeaseDetail> {
    const res = await api.get<ApiEnvelope<AdminLeaseDetail>>(`/admin/leases/${leaseId}`);
    return unwrap(res.data);
  },

  async listPayouts(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<Paginated<AdminPayoutRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminPayoutRow>>>("/admin/payouts", { params });
    return unwrap(res.data);
  },

  async getFinancialReport(rangeDays = 30): Promise<FinancialReport> {
    const res = await api.get<ApiEnvelope<FinancialReport>>("/admin/reports/financial", {
      params: { range: rangeDays },
    });
    return unwrap(res.data);
  },

  async listListings(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<Paginated<AdminListingRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminListingRow>>>("/admin/listings", { params });
    return unwrap(res.data);
  },

  async listReservations(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<Paginated<AdminReservationRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminReservationRow>>>("/admin/reservations", { params });
    return unwrap(res.data);
  },

  async listAuditLog(params: {
    page?: number;
    limit?: number;
    action?: string;
  }): Promise<Paginated<AdminAuditRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminAuditRow>>>("/admin/audit-log", { params });
    return unwrap(res.data);
  },

  /**
   * Trigger a CSV download by hitting the export endpoint with a blob response,
   * then materialising it as a temporary file download in the browser.
   */
  async downloadCsv(
    path: "/admin/transactions/export" | "/admin/payouts/export",
    filename: string,
    params: Record<string, string | undefined> = {}
  ): Promise<void> {
    const res = await api.get(path, { params, responseType: "blob" });
    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async listPendingKyc(params: {
    page?: number;
    limit?: number;
  }): Promise<Paginated<AdminKycRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminKycRow>>>("/admin/kyc/pending", { params });
    return unwrap(res.data);
  },

  async approveKyc(userId: string): Promise<void> {
    await api.post(`/admin/kyc/${userId}/approve`);
  },

  async rejectKyc(userId: string, reason: string): Promise<void> {
    await api.post(`/admin/kyc/${userId}/reject`, { reason });
  },

  async listReports(params: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AdminReportRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminReportRow>>>("/admin/reports", { params });
    return unwrap(res.data);
  },

  async resolveReport(reportId: string, action: ReportAction, note?: string): Promise<void> {
    await api.post(`/admin/reports/${reportId}/resolve`, { action, note });
  },

  async listDeletionRequests(params: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AdminDeletionRequestRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminDeletionRequestRow>>>(
      "/admin/deletion-requests",
      { params }
    );
    return unwrap(res.data);
  },

  async resolveDeletionRequest(
    requestId: string,
    action: "completed" | "rejected",
    notes?: string,
  ): Promise<void> {
    await api.post(`/admin/deletion-requests/${requestId}/resolve`, { action, notes });
  },
};

export default adminApi;
