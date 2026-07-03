"use client";

import { API_BASE_URL } from "./api";

export type NewsletterSource =
  | "newsletter-footer"
  | "newsletter-landing"
  | "newsletter-guides";

/**
 * Subscribe an email to the nurture list. Public endpoint (no auth), so a
 * plain fetch keeps it independent of the axios/session stack, same pattern
 * as the demo-request and founding waitlist clients. Never throws.
 */
export async function subscribeNewsletter(payload: {
  email: string;
  name?: string;
  source: NewsletterSource;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error, please try again." };
  }
}

/** Unsubscribe an email. Never throws. */
export async function unsubscribeNewsletter(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error, please try again." };
  }
}
