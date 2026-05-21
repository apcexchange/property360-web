import axios, { AxiosError } from "axios";
import { session } from "./session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.property360.africa/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Detail surfaced to the SubscriptionLimitModal in /app/* when a 402 fires.
 * Matches the shape produced by backend/src/middleware/subscription.ts.
 */
export type SubscriptionLimitReason =
  | "PROPERTY_LIMIT_REACHED"
  | "AGENT_SEAT_LIMIT_REACHED"
  | "SUBSCRIPTION_EXPIRED";

export interface SubscriptionLimitDetail {
  reason: SubscriptionLimitReason;
  message?: string;
  tier?: string;
  status?: string;
  propertyCount?: number;
  propertyLimit?: number;
  agentSeatCount?: number;
  agentSeatLimit?: number;
  manageUrl?: string;
}

export const SUBSCRIPTION_LIMIT_EVENT = "p360:subscription-limit";

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (typeof window === "undefined") return Promise.reject(error);

    // Auth lapsed — drop the session and route the user to the appropriate
    // login page based on what they were trying to do. /admin keeps its
    // separate login; everything else (including /app, /billing, /login,
    // /onboarding, and the marketing site) uses /login.
    //
    // Skip the redirect when the failing request IS the sign-in call
    // itself — a 401 there just means "wrong credentials", and the page
    // already shows the error. Same for the password-change endpoint.
    if (error.response?.status === 401) {
      const reqUrl = error.config?.url ?? "";
      const isAuthAttempt =
        reqUrl.includes("/auth/login") ||
        reqUrl.includes("/auth/register") ||
        reqUrl.includes("/auth/password");
      if (!isAuthAttempt) {
        session.clear();
        const path = window.location.pathname;
        if (path.startsWith("/admin")) {
          if (!path.startsWith("/admin/login")) {
            window.location.href = "/admin/login";
          }
        } else if (path !== "/login") {
          const next = encodeURIComponent(path + window.location.search);
          window.location.href = `/login?next=${next}`;
        }
      }
      return Promise.reject(error);
    }

    // Subscription limit / expiry — backend uses HTTP 402 with an `error`
    // code so the client can route. We broadcast a window event so the
    // modal mounted in /app/layout can react without us needing a global
    // store. The promise still rejects so React Query / form state can
    // reset stuck submit buttons.
    if (error.response?.status === 402) {
      const body = (error.response.data ?? {}) as {
        message?: string;
        error?: SubscriptionLimitReason;
        data?: Omit<SubscriptionLimitDetail, "reason" | "message">;
      };
      if (body.error) {
        const detail: SubscriptionLimitDetail = {
          reason: body.error,
          message: body.message,
          ...(body.data ?? {}),
        };
        window.dispatchEvent(
          new CustomEvent(SUBSCRIPTION_LIMIT_EVENT, { detail })
        );
      }
    }

    return Promise.reject(error);
  }
);

// Backend wraps every response in { success, message, data }
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;
