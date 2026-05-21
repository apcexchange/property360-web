"use client";

import { api, unwrap } from "./api";
import { session, AdminUser } from "./session";

export type SubscriptionTier = "trial" | "solo" | "pro" | "agency" | "custom";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";
export type BillingInterval = "monthly" | "annual";

export interface SubscriptionUsage {
  propertyCount: number;
  agentSeatCount: number;
  propertyLimit: number;
  agentSeatLimit: number;
}

export interface SubscriptionView {
  applicable: true;
  tier: SubscriptionTier;
  tierDisplayName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  startedAt: string;
  renewsAt?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  usage: SubscriptionUsage;
  hasCapacityForProperty: boolean;
  hasCapacityForAgentSeat: boolean;
  isEntitled: boolean;
  manageUrl: string;
}

export interface SubscriptionNotApplicable {
  applicable: false;
  role: string;
}

export type SubscriptionResponse = SubscriptionView | SubscriptionNotApplicable;

interface CheckoutResponse {
  authorizationUrl: string;
  reference: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AdminUser;
}

export const billingApi = {
  /**
   * Backend `/auth/login` accepts `identifier` (email OR phone) and returns
   * `accessToken` / `refreshToken`. We store the access token in the shared
   * web session under the existing `p360_admin_token` key — admin and billing
   * coexist by role, not by separate sessions.
   */
  async login(emailOrPhone: string, password: string): Promise<LoginResponse> {
    const res = await api.post("/auth/login", {
      identifier: emailOrPhone,
      password,
    });
    const data = unwrap(res.data) as LoginResponse;
    if (!data?.accessToken || !data?.user) {
      throw new Error("Invalid login response");
    }
    if (data.user.role !== "landlord") {
      throw new Error(
        "This account is not a landlord. Subscriptions are landlord-only."
      );
    }
    session.set(data.accessToken, data.user);
    return data;
  },

  async getSubscription(): Promise<SubscriptionResponse> {
    const res = await api.get("/subscriptions/me");
    return unwrap(res.data) as SubscriptionResponse;
  },

  async createCheckout(
    tier: "solo" | "pro" | "agency",
    interval: BillingInterval = "monthly"
  ): Promise<CheckoutResponse> {
    const res = await api.post("/subscriptions/checkout", { tier, interval });
    return unwrap(res.data) as CheckoutResponse;
  },

  async cancel(): Promise<void> {
    await api.post("/subscriptions/cancel");
  },
};
