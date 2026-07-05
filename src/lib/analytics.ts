// PostHog analytics wrapper. Call sites import from here, never posthog-js
// directly, so a missing NEXT_PUBLIC_POSTHOG_KEY (or an SSR context) is always a
// safe no-op. Init happens once from PostHogProvider; every other export guards
// on `initialized` so an early call (e.g. identify on login before the provider
// mounts) is dropped rather than throwing "posthog not initialized".

import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const OPT_OUT_KEY = "ph_opt_out";

let initialized = false;

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
