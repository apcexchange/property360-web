"use client";

// Lightweight Meta Pixel + Conversions API helper.
//
// Each meaningful event fires twice with a shared event_id: once through the
// browser pixel (window.fbq) and once through our /api/meta/track route, which
// relays it to Meta's Conversions API server-side. Meta de-duplicates on the
// event_id, so we keep signal even when the browser pixel is blocked by an
// ad-blocker or Safari ITP — which is most of the Nigerian mobile audience.
//
// Everything no-ops cleanly until NEXT_PUBLIC_META_PIXEL_ID is set, so the site
// behaves normally before the Pixel exists.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type PixelParams = Record<string, unknown>;

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Track a standard Meta event (e.g. "ViewContent", "Lead",
 * "CompleteRegistration"). `userData` is only needed for high-value events
 * where we have it (signup): it is sent raw to our own server route, which
 * hashes it before it ever reaches Meta.
 */
export function trackMeta(
  eventName: string,
  params: PixelParams = {},
  userData: MetaUserData = {}
): void {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  const eventId = newEventId();

  // 1) Browser pixel (when loaded and not blocked).
  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, params, { eventID: eventId });
  }

  // 2) Server relay -> Conversions API. keepalive lets it survive the
  // navigation that usually follows a Lead / CompleteRegistration.
  fetch("/api/meta/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      params,
      userData,
    }),
    keepalive: true,
  }).catch(() => {});
}
