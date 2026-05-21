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

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    // Auth lapsed — drop the session and route the user to the appropriate
    // login page based on what they were trying to do. Admin and landlord
    // billing share the same JWT storage; only the login UX differs.
    if (error.response?.status === 401 && typeof window !== "undefined") {
      session.clear();
      const path = window.location.pathname;
      if (path.startsWith("/billing")) {
        if (!path.startsWith("/billing/login")) {
          const next = encodeURIComponent(path + window.location.search);
          window.location.href = `/billing/login?next=${next}`;
        }
      } else if (!path.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
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
