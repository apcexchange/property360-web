"use client";

import { api, unwrap } from "./api";
import { session, AdminUser } from "./session";

export type UserRole = "landlord" | "tenant" | "agent";

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  /** Optional referral code from /onboarding?ref=…, backend silently ignores invalid codes. */
  referralCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AdminUser;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post("/auth/register", payload);
    const data = unwrap(res.data) as AuthResponse;
    if (!data?.accessToken || !data?.user) {
      throw new Error("Register failed: unexpected response.");
    }
    session.set(data.accessToken, data.user);
    return data;
  },

  /**
   * Generic sign-in. Accepts email or phone as identifier. Does NOT
   * enforce any role gate, the caller decides what to do with the
   * user after authenticating.
   */
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const res = await api.post("/auth/login", { identifier, password });
    const data = unwrap(res.data) as AuthResponse;
    if (!data?.accessToken || !data?.user) {
      throw new Error("Invalid login response");
    }
    session.set(data.accessToken, data.user);
    return data;
  },

  /** Send an OTP to the user's phone or email. */
  async sendOtp(type: "phone" | "email", value: string): Promise<void> {
    await api.post("/auth/otp/send", { type, value });
  },

  /** Verify an OTP previously sent. Returns true if the code is valid. */
  async verifyOtp(
    type: "phone" | "email",
    value: string,
    otp: string
  ): Promise<boolean> {
    const res = await api.post("/auth/otp/verify", { type, value, otp });
    const data = unwrap(res.data) as { verified: boolean };
    return !!data?.verified;
  },

  /**
   * Resend the email-verification OTP to the currently signed-in user. The
   * first one is sent automatically by /auth/register; this is for the
   * "didn't get it?" button on the verify-email screen.
   */
  async resendEmailVerification(): Promise<void> {
    await api.post("/auth/email/send-verification");
  },

  /**
   * Submit the 6-digit code from the verify-email screen. On success the
   * backend flips emailVerified=true and returns the updated user; we mirror
   * that into the local session so the UI unblocks immediately.
   */
  async verifyEmail(code: string): Promise<AdminUser> {
    const res = await api.post("/auth/email/verify", { code });
    const data = unwrap(res.data) as { user: AdminUser };
    if (!data?.user) {
      throw new Error("Verify email failed: unexpected response.");
    }
    // Reuse the existing token; only the user shape changes.
    const token = session.getToken();
    if (token) session.set(token, data.user);
    return data.user;
  },

  /** Send an SMS OTP to the signed-in user's phone (in-app phone-verify modal). */
  async sendPhoneVerification(): Promise<void> {
    await api.post("/auth/phone/send-verification");
  },

  /** Verify the SMS code; on success flips phoneVerified=true on the user. */
  async verifyPhone(code: string): Promise<AdminUser> {
    const res = await api.post("/auth/phone/verify", { code });
    const data = unwrap(res.data) as { user: AdminUser };
    if (!data?.user) {
      throw new Error("Verify phone failed: unexpected response.");
    }
    const token = session.getToken();
    if (token) session.set(token, data.user);
    return data.user;
  },
};
