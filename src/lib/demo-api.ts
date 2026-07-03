"use client";

import { API_BASE_URL } from "./api";

export interface DemoRequestPayload {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  preferredAt: string;
  message: string;
}

/**
 * Submit a "Request a Demo" lead. Public endpoint (no auth), so a plain
 * fetch keeps it independent of the axios/session stack, same pattern as
 * the Founding 50 waitlist. Never throws: resolves { ok: false } on any
 * failure so the form can fall back to the WhatsApp quick-chat path.
 */
export async function requestDemo(
  payload: DemoRequestPayload
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/demo-requests`, {
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
