import { api, unwrap, ApiEnvelope } from "./api";
import { AdminUser, session } from "./session";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Stats {
  landlordCount: number;
  tenantCount: number;
  agentCount: number;
  propertyCount: number;
  activeLeaseCount: number;
  pendingKycCount: number;
  rentCollected30d: number;
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
  }): Promise<Paginated<AdminTransactionRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminTransactionRow>>>("/admin/transactions", { params });
    return unwrap(res.data);
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
};

export default adminApi;
