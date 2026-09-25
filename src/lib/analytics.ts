// PostHog analytics wrapper. Call sites import from here, never posthog-js
// directly, so a missing NEXT_PUBLIC_POSTHOG_KEY (or an SSR context) is always a
// safe no-op. Init happens once from PostHogProvider; every other export guards
// on `initialized` so an early call (e.g. identify on login before the provider
// mounts) is dropped rather than throwing "posthog not initialized".

import posthog, { type CaptureResult } from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const OPT_OUT_KEY = "ph_opt_out";
const TOKEN_PARAM = "token";

let initialized = false;

/**
 * Strip a `?token=...` query param from a URL-ish string (absolute or
 * relative), preserving the rest of the query string, path and hash.
 * Used so the signed one-click unsubscribe/opt-in token on /email/* never
 * ends up recorded in PostHog. Returns the input unchanged if it isn't a
 * parseable URL or doesn't carry the param.
 */
function stripTokenParam(value: string): string {
  if (!value.includes(`${TOKEN_PARAM}=`)) return value;
  const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith("//");
  try {
    const u = new URL(value, isAbsolute ? undefined : "http://p360.local");
    if (!u.searchParams.has(TOKEN_PARAM)) return value;
    u.searchParams.delete(TOKEN_PARAM);
    return isAbsolute ? u.toString() : `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return value;
  }
}

/**
 * PostHog before_send hook: scrubs `token` out of every string property
 * (this covers $current_url, $referrer, $pathname and any custom
 * URL-valued property) before the event leaves the browser, so a leaked
 * event can never carry a live unsubscribe/opt-in credential.
 */
function sanitizeCaptureResult(cr: CaptureResult | null): CaptureResult | null {
  if (!cr || !cr.properties) return cr;
  let changed = false;
  const properties = { ...cr.properties };
  for (const key of Object.keys(properties)) {
    const value = properties[key];
    if (typeof value === "string" && value.includes(`${TOKEN_PARAM}=`)) {
      properties[key] = stripTokenParam(value);
      changed = true;
    }
  }
  return changed ? { ...cr, properties } : cr;
}

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY || typeof window === "undefined") return;
  const optedOut = window.localStorage.getItem(OPT_OUT_KEY) === "1";
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // We send $pageview manually on route change (App Router does not fire a
    // full navigation), so disable the SDK's automatic one to avoid doubles.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    opt_out_capturing_by_default: optedOut,
    before_send: sanitizeCaptureResult,
  });
  initialized = true;
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (initialized) posthog.capture(event, props);
}

export function capturePageview() {
  // posthog reads window.location itself, so UTM/referrer are picked up here.
  if (initialized) posthog.capture("$pageview");
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (initialized) posthog.identify(id, props);
}

export function resetAnalytics() {
  if (initialized) posthog.reset();
}

export function optOut() {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  window.localStorage.setItem(OPT_OUT_KEY, "1");
  if (initialized) posthog.opt_out_capturing();
}
