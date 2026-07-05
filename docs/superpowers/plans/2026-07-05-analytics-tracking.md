# PostHog Analytics Implementation Plan

> Execute with care: two independent repos (web, mobile), no test runner in either.
> Verify with `npx tsc --noEmit` / `npm run build` (web) and `tsc` baseline (mobile), plus
> PostHog Live Events. Spec: `docs/superpowers/specs/2026-07-05-analytics-tracking-design.md`.

**Goal:** Visitor + product analytics via PostHog Cloud EU on the live website and the app.

**Config (public client key, safe to commit):**
`phc_qW45f2M2fD88ptTYcAiWzmaMPwZUjtWGsCjNsngrCC82`, host `https://eu.i.posthog.com`.

**Branch strategy (both repos are clean on `feat/wallet-ui`; do NOT disturb it):**
- Web: work in an **isolated worktree** off `origin/main` (local `main` is 6 behind), branch
  `feat/analytics-posthog`. Web production auto-deploys from `main`.
- Mobile: worktree off the mobile repo's `main` (or `develop`), branch `feat/analytics-posthog`.
  No auto-deploy; ships on the next store build.

## Phasing

- **Phase 1 (this plan):** SDK init + autocapture + pageviews + UTM/referrer + `identify` on
  login + light consent (web). This alone delivers "how many visitors + where from" plus
  basic in-app behavior. Adds two high-value manual events: `signup_completed`, `cta_clicked`.
- **Phase 2 (follow-up, separate pass):** wire remaining funnel events (`property_added`,
  `tenant_added`, `invoice_created`, `payment_recorded`, `subscription_started`) at their
  action sites in both codebases. Listed at the end; not built in Phase 1.

---

## Workstream A — Web (`property360-web.git`)

**Files:**
- Create: `src/lib/analytics.ts` (typed event helpers + init guard)
- Create: `src/components/PostHogProvider.tsx` (`"use client"` — init + route pageviews)
- Create: `src/components/ConsentNotice.tsx` (`"use client"` — dismissible, opt-out)
- Modify: `src/app/layout.tsx` (mount provider + notice)
- Modify: `.env.local` and `.env.example` (add the two vars)
- Modify: `package.json` (add `posthog-js`)

### A1. Install + env
- `npm install posthog-js` in the worktree.
- Add to `.env.local` and document in `.env.example`:
  - `NEXT_PUBLIC_POSTHOG_KEY=phc_qW45f2M2fD88ptTYcAiWzmaMPwZUjtWGsCjNsngrCC82`
  - `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- Add the same two vars in the Vercel project (Production) before the deploy.

### A2. `src/lib/analytics.ts`
Thin wrapper so call sites never import posthog-js directly and a missing key is a no-op.
```ts
import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function capture(event: string, props?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, props);
}
export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.identify(id, props);
}
export function resetAnalytics() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}
```

### A3. `src/components/PostHogProvider.tsx`
`"use client"`. Init once; capture `$pageview` on pathname change (App Router does not fire a
full navigation). Respect a prior opt-out from localStorage.
```tsx
"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { POSTHOG_KEY, POSTHOG_HOST } from "@/lib/analytics";

let initialized = false;
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!POSTHOG_KEY || initialized) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // we send manually on route change
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      opt_out_capturing_by_default:
        typeof window !== "undefined" &&
        window.localStorage.getItem("ph_opt_out") === "1",
    });
    initialized = true;
  }, []);
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized) return;
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, searchParams]);
  return <>{children}</>;
}
```
Note: `useSearchParams` requires a `<Suspense>` boundary in the App Router; wrap the provider
usage in `<Suspense>` in the layout (or read `window.location.search` instead to avoid it).

### A4. `src/components/ConsentNotice.tsx`
`"use client"`. Small fixed-bottom dismissible bar. "Got it" sets `ph_seen`; "Decline" sets
`ph_opt_out=1` and calls `posthog.opt_out_capturing()`. Hidden once `ph_seen` or `ph_opt_out`
is set. Style with existing Tailwind tokens; keep it lightweight (not a blocking modal).

### A5. Mount in `src/app/layout.tsx`
Wrap `{children}` with `<PostHogProvider>` (inside a `<Suspense>`), render `<ConsentNotice/>`
near the existing `<Analytics/>`. Keep `<Analytics/>` (Vercel) untouched.

### A6. `identify` on login + two manual events
- After a successful login/session hydrate on web, call `identifyUser(userId, { role })`.
  Locate the web auth success path (the axios/login handler or the app shell that reads the
  stored session) and add the call; call `resetAnalytics()` on logout.
- `signup_completed`: fire `capture("signup_completed", { role })` at the web signup success.
- `cta_clicked`: fire `capture("cta_clicked", { location })` on the WhatsApp / request-demo
  CTAs (search `RoleSplit.tsx` and landing CTA components).

### A7. Verify web
- `npx tsc --noEmit` clean; `npm run build` passes.
- `npm run dev`, load `/?utm_source=test&utm_medium=probe`; confirm a `$pageview` with those
  UTM props in PostHog Live Events (EU). Click a CTA → `cta_clicked`. Decline consent →
  capture stops.
- Commit on `feat/analytics-posthog`.

---

## Workstream B — Mobile (`property360-mobile.git`)

**Files:**
- Create: `src/services/analytics.ts` (init + typed helpers, guarded on key)
- Modify: `App.tsx` (wrap tree in `PostHogProvider`, add navigation screen tracking)
- Modify: `app.config.ts` (`extra.posthogKey`, `extra.posthogHost`)
- Modify: auth flow (identify on login, reset on logout)
- Modify: `package.json` (add `posthog-react-native` + `@react-native-async-storage/async-storage` if absent)

### B1. Install
- `yarn add posthog-react-native @react-native-async-storage/async-storage`
  (mobile uses yarn). AsyncStorage is PostHog's default persistence; MMKV stays for
  Redux/tokens.
- **Dev-client rebuild required** (`expo run:ios` / `expo run:android`) — native module.

### B2. `app.config.ts`
Add under `extra`: `posthogKey: 'phc_qW45f2M2fD88ptTYcAiWzmaMPwZUjtWGsCjNsngrCC82'`,
`posthogHost: 'https://eu.i.posthog.com'`. Read via `Constants.expoConfig?.extra`.

### B3. `src/services/analytics.ts`
Instantiate `PostHog` with the key/host (guarded: if no key, export no-op stubs). Export
`captureEvent`, `identifyUser`, `resetAnalytics`. Mirror the web event names exactly.

### B4. `App.tsx`
Wrap the tree in `<PostHogProvider client={posthog} autocapture>` (place inside the existing
provider tree; it needs to be above navigation for screen autocapture). Add React Navigation
screen tracking via the `NavigationContainer` `onStateChange`/ref → `captureEvent("$screen",
{ screen_name })`, or PostHog's navigation autocapture if enabled.

### B5. identify + events
- On login success (auth slice / login thunk), `identifyUser(userId, { role })`; on logout,
  `resetAnalytics()`.
- `signup_completed` at mobile signup success.

### B6. Verify mobile
- `npx tsc --noEmit` holds at the existing 28-error baseline (0 new).
- Dev-client rebuild, open the app, navigate a few screens → confirm app-open + `$screen`
  events in PostHog Live Events. Sign up / log in → `signup_completed` + person identified.
- Commit on `feat/analytics-posthog`.

---

## Deploy gate (do NOT push without explicit confirmation)

1. Web: push `feat/analytics-posthog` → Vercel **preview** deploy → verify events land from
   the preview URL → then merge to `main` for production (auto-deploy). Add the two env vars
   to Vercel Production first.
2. Mobile: merge to the release branch; ships on the next store build (no OTA).

## Phase 2 backlog (not built here)
Instrument at action sites, both codebases, same event names:
`property_added`, `tenant_added`, `invoice_created`, `payment_recorded`,
`subscription_started`, and `wallet_funded` once the wallet ships.
