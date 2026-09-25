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
 * Recursively scrubs `token` out of every string found anywhere inside
 * `value` (plain objects and arrays, at any depth), stripping only the
 * `token` query param and keeping every other param, path segment and hash
 * intact. Non-string, non-object values (numbers, booleans, null) pass
 * through untouched.
 */
function sanitizeDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.includes(`${TOKEN_PARAM}=`) ? stripTokenParam(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeDeep(v);
    }
    return out;
  }
  return value;
}

/**
 * PostHog before_send hook: scrubs `token` out of `properties` (this covers
 * $current_url, $referrer, $pathname and any custom URL-valued property, at
 * any nesting depth) as well as $set and $set_once, before the event leaves
 * the browser, so a leaked event can never carry a live unsubscribe/opt-in
 * credential.
 */
function sanitizeCaptureResult(cr: CaptureResult | null): CaptureResult | null {
  if (!cr) return cr;
  return {
    ...cr,
    properties: cr.properties ? (sanitizeDeep(cr.properties) as CaptureResult["properties"]) : cr.properties,
    ...(cr.$set ? { $set: sanitizeDeep(cr.$set) as CaptureResult["$set"] } : {}),
    ...(cr.$set_once ? { $set_once: sanitizeDeep(cr.$set_once) as CaptureResult["$set_once"] } : {}),
  };
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
