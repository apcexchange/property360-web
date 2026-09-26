"use client";

import { API_BASE_URL } from "./api";

/**
 * One-click links from Property360 sales emails. Public endpoints (no auth):
 * the signed token in the link is the only credential. These are POST
 * endpoints (a GET can't change state, so a link scanner or a mail client's
 * prefetch that only fetches the URL cannot unsubscribe or opt in anyone),
 * called from the browser with a JSON body, never at build or prefetch time.
 * Never throws.
 */
export type EmailPrefAction = "unsubscribe" | "opt-in";

export async function applyEmailPreference(
  action: EmailPrefAction,
  token: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/email/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error, please try again." };
  }
}
