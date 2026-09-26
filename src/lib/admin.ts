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

export interface AdminTenantReferralRow {
  _id: string;
  owner: { _id: string; firstName: string; lastName: string; email: string; phone?: string } | null;
  referee: { _id: string; firstName: string; lastName: string; email: string; role: string } | null;
  basisAmount: number;
  rate: number;
  commissionAmount: number;
  status: "accrued" | "paid_out" | "reversed";
  needsReview?: boolean;
  createdAt: string;
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
  moderationStatus?: "pending" | "approved" | "rejected" | "paused";
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
export interface AdminListingReportRow { _id: string; reason: string; detail?: string; createdAt: string; unit?: { listingTitle?: string; unitNumber?: string }; reporter?: { firstName?: string; lastName?: string; email?: string }; }

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

export interface AdminSalesLeadRow {
  _id: string;
  sessionId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  portfolioSize?: string | null;
  quality?: string | null;
  status: string;
  sourcePage?: string | null;
  attribution?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
    landingPath?: string | null;
    referrer?: string | null;
  } | null;
  messageCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
}

// -- AI sales follow-up ----------------------------------------------------
export type SalesTrack = "trial" | "post_trial" | "cancelled" | "past_due";
export type SalesJourneyStatus = "active" | "paused_reply" | "converted" | "stopped" | "completed";
export type SalesVariant = "A" | "B";
export type StepVariantSetting = "ab" | "A" | "B";
export type SalesTouchStatus = "sent" | "delivered" | "failed" | "skipped" | "dry_run";

export interface SalesFollowUpSettings {
  paused: boolean;
  previewMode: boolean;
  stepVariants: Record<string, StepVariantSetting>;
  /**
   * Server-side WHATSAPP_DRY_RUN flag (independent of previewMode). When
   * true, WhatsApp steps are consumed (counted, marked sent) but nothing
   * actually reaches the recipient. Surfaced so the admin can tell "live"
   * apart from "live, but WhatsApp is quietly a no-op".
   */
  whatsappDryRun: boolean;
}

export interface SalesStepInfo {
  key: string;
  track: SalesTrack;
  dayOffset: number;
  channel: "whatsapp" | "email" | "both";
  emailFallback: boolean;
  marketing: boolean;
  templateKey: string | null;
  emailKey: string | null;
  /** An approved Meta template name is configured for variant A / B. */
  whatsappA: boolean;
  whatsappB: boolean;
  variantSetting: StepVariantSetting;
}

export interface SalesFunnelRow {
  track: SalesTrack;
  stepKey: string;
  variant: SalesVariant;
  channel: "whatsapp" | "email";
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
  dryRun: number;
  replied: number;
  optedOut: number;
  subscribed: number;
}

export interface SalesFollowUpStats {
  settings: SalesFollowUpSettings;
  steps: SalesStepInfo[];
  totals: {
    activeJourneys: number;
    hotJourneys: number;
    conversionsThisMonth: number;
    conversionsViaChatThisMonth: number;
    revenueThisMonthNgn: number;
    conversionsAllTime: number;
    revenueAllTimeNgn: number;
  };
  funnel: SalesFunnelRow[];
}

export interface SalesJourneyRow {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
  } | null;
  track: SalesTrack;
  trackStartedAt: string;
  stepIndex: number;
  nextStepAt?: string;
  variant: SalesVariant;
  status: SalesJourneyStatus;
  stopReason?: string;
  stopNote?: string;
  hot: boolean;
  hotAt?: string;
  handoffSummary?: string;
  lastUserReplyAt?: string;
  lastWhatsappAt?: string;
  lastEmailAt?: string;
  whatsappUnpromptedCount: number;
  whatsappDisabled: boolean;
  emailUnsubscribed: boolean;
  lastPlanLink?: { tier: string; interval: string; at: string };
  convertedAt?: string;
  convertedAmountNgn?: number;
  attributedStep?: string;
  attributedToChat?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTouchRow {
  _id: string;
  stepKey: string;
  channel: "whatsapp" | "email";
  variant: SalesVariant;
  templateOrEmailKey: string;
  status: SalesTouchStatus;
  skipReason?: string;
  repliedAt?: string;
  optedOutAt?: string;
  convertedAt?: string;
  createdAt: string;
}

export interface SalesJourneyDetail {
  journey: SalesJourneyRow;
  touches: SalesTouchRow[];
  messages: {
    _id: string;
    role: "user" | "assistant";
    content: string;
    mode?: "normal" | "sales";
    createdAt: string;
  }[];
  subscription: {
    status: string;
    tier: string;
    trialEndsAt?: string | null;
    renewsAt?: string | null;
  } | null;
}

export interface AdminSalesLeadDetail {
  lead: AdminSalesLeadRow;
  messages: { role: "user" | "assistant"; content: string; createdAt: string }[];
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
    document?: { type?: string; number?: string; uploadedAt?: string; imageUrl?: string; imageSignedUrl?: string };
    selfieUrl?: string;
    selfieSignedUrl?: string;
  };
  createdAt: string;
}

// Row shape returned by GET /admin/partners (owner populated + rollup stats
// attached). Distinct from AdminPartnerCode below, which is the raw
// PartnerCode document returned by mint/invite/status endpoints (owner is
// an unpopulated id string, no stats).
export interface AdminPartnerRow {
  _id: string;
  code: string;
  status: "active" | "disabled";
  commissionRate: number;
  label?: string;
  owner: { _id: string; firstName: string; lastName: string; email: string; role: string };
  signups: number;
  paidConversions: number;
  totalEarned: number;
}

export interface AdminPartnerCode {
  _id: string;
  code: string;
  owner: string;
  commissionRate: number;
  status: "active" | "disabled";
  label?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPartnerDetail {
  code: {
    _id: string;
    code: string;
    status: string;
    commissionRate: number;
    label?: string;
    owner: { _id: string; firstName: string; lastName: string; email: string; role: string };
  };
  commissions: Array<{
    _id: string;
    basisAmount: number;
    rate: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
    referee?: { firstName: string; lastName: string; email: string };
  }>;
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

  async listTenantReferrals(params: { page?: number }): Promise<Paginated<AdminTenantReferralRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminTenantReferralRow>>>("/admin/tenant-referrals", { params });
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
  async listListingReports(params: { page?: number; limit?: number }): Promise<Paginated<AdminListingReportRow>> { const res = await api.get<ApiEnvelope<Paginated<AdminListingReportRow>>>("/admin/listing-reports", { params }); return unwrap(res.data); },
  async resolveListingReport(id: string, action: "dismissed" | "paused" | "rejected"): Promise<void> { await api.post(`/admin/listing-reports/${id}/resolve`, { action }); },
  async setListingModeration(
    unitId: string,
    status: "approved" | "rejected" | "paused",
    reason?: string
  ): Promise<AdminListingRow> {
    const res = await api.patch<ApiEnvelope<AdminListingRow>>(`/admin/listings/${unitId}/moderation`, { status, reason });
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

  async listSalesLeads(params: {
    status?: string;
    quality?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AdminSalesLeadRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminSalesLeadRow>>>("/admin/sales/leads", { params });
    return unwrap(res.data);
  },

  async getSalesLead(leadId: string): Promise<AdminSalesLeadDetail> {
    const res = await api.get<ApiEnvelope<AdminSalesLeadDetail>>(`/admin/sales/leads/${leadId}`);
    return unwrap(res.data);
  },

  async getSalesFollowUpStats(): Promise<SalesFollowUpStats> {
    const res = await api.get<ApiEnvelope<SalesFollowUpStats>>("/admin/sales-followup/stats");
    return unwrap(res.data);
  },

  async updateSalesFollowUpSettings(body: {
    paused?: boolean;
    previewMode?: boolean;
    stepVariants?: Record<string, StepVariantSetting>;
  }): Promise<SalesFollowUpSettings> {
    const res = await api.patch<ApiEnvelope<SalesFollowUpSettings>>("/admin/sales-followup/settings", body);
    return unwrap(res.data);
  },

  async listSalesJourneys(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    track?: string;
    hot?: boolean;
  }): Promise<Paginated<SalesJourneyRow>> {
    const res = await api.get<ApiEnvelope<Paginated<SalesJourneyRow>>>("/admin/sales-followup/journeys", {
      params: { ...params, hot: params.hot ? "true" : undefined },
    });
    return unwrap(res.data);
  },

  async getSalesJourney(id: string): Promise<SalesJourneyDetail> {
    const res = await api.get<ApiEnvelope<SalesJourneyDetail>>(`/admin/sales-followup/journeys/${id}`);
    return unwrap(res.data);
  },

  async stopSalesJourney(id: string): Promise<SalesJourneyRow> {
    const res = await api.post<ApiEnvelope<SalesJourneyRow>>(`/admin/sales-followup/journeys/${id}/stop`);
    return unwrap(res.data);
  },

  async restartSalesJourney(id: string): Promise<SalesJourneyRow> {
    const res = await api.post<ApiEnvelope<SalesJourneyRow>>(`/admin/sales-followup/journeys/${id}/restart`);
    return unwrap(res.data);
  },

  async updateSalesLead(leadId: string, status: string): Promise<AdminSalesLeadRow> {
    const res = await api.patch<ApiEnvelope<AdminSalesLeadRow>>(`/admin/sales/leads/${leadId}`, { status });
    return unwrap(res.data);
  },

  async listPartnerCodes(): Promise<AdminPartnerRow[]> {
    const res = await api.get<ApiEnvelope<AdminPartnerRow[]>>("/admin/partners");
    return unwrap(res.data);
  },

  async mintPartnerCode(input: {
    code: string;
    ownerId: string;
    commissionRate: number;
    label?: string;
  }): Promise<AdminPartnerCode> {
    const res = await api.post<ApiEnvelope<AdminPartnerCode>>("/admin/partners", input);
    return unwrap(res.data);
  },

  async invitePartner(input: {
    email: string;
    firstName: string;
    lastName: string;
    code: string;
    commissionRate: number;
    label?: string;
  }): Promise<AdminPartnerCode> {
    const res = await api.post<ApiEnvelope<AdminPartnerCode>>("/admin/partners/invite", input);
    return unwrap(res.data);
  },

  async getPartnerDetail(id: string): Promise<AdminPartnerDetail> {
    const res = await api.get<ApiEnvelope<AdminPartnerDetail>>(`/admin/partners/${id}`);
    return unwrap(res.data);
  },

  async setPartnerStatus(id: string, status: "active" | "disabled"): Promise<AdminPartnerCode> {
    const res = await api.patch<ApiEnvelope<AdminPartnerCode>>(`/admin/partners/${id}/status`, { status });
    return unwrap(res.data);
  },

  async updatePartnerRate(id: string, commissionRate: number): Promise<AdminPartnerCode> {
    const res = await api.patch<ApiEnvelope<AdminPartnerCode>>(
      `/admin/partners/${id}/rate`,
      { commissionRate }
    );
    return unwrap(res.data);
  },

  async deletePartner(
    id: string
  ): Promise<{ deletedCommissions: number; detachedSignups: number }> {
    const res = await api.delete<
      ApiEnvelope<{ deletedCommissions: number; detachedSignups: number }>
    >(`/admin/partners/${id}`);
    return unwrap(res.data);
  },
};

export default adminApi;
