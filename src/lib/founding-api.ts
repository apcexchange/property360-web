"use client";

import { API_BASE_URL } from "./api";

export interface FoundingStatus {
  enabled: boolean;
  total: number;
  claimed: number;
  remaining: number;
}

/**
 * Live "Founding 50" slot counter for the marketing site. Public endpoint
 * (no auth), so a plain fetch keeps it independent of the axios/session stack.
 * Never throws — returns null on failure so the UI can fall back gracefully
 * (show the offer copy without a live number rather than break the page).
 */
export async function getFoundingStatus(): Promise<FoundingStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/founding/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: FoundingStatus };
    return body.data ?? null;
  } catch {
    return null;
  }
}

/** Capture a post-sellout waitlist email. Resolves true on success. */
export async function joinFoundingWaitlist(
  email: string,
  name?: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/founding/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}
