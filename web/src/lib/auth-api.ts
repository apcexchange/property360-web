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
};
