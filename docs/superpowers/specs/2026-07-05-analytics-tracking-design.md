# Visitor + Product Analytics (PostHog) — Design

Date: 2026-07-05
Status: Approved design (defaults locked), pending spec review
Scope: Web (property360-web.git) + mobile (property360-mobile.git)

## 1. Goal

Answer two questions the founder asked, across both the website and the app:
1. **How many visitors / users, and where do they come from** (referrer, UTM source /
   medium / campaign, country, device).
2. **What they do once they arrive** (signup → add property → record payment →
   subscribe), so a raw visitor count becomes "which channel produces paying landlords."

Chosen tool: **PostHog Cloud (EU region)**, one project spanning web + app, on the free
tier. We keep the existing **Vercel Web Analytics** as a zero-effort, cookieless traffic
snapshot; PostHog is the deep layer that also covers the app and product funnels.

## 2. Why PostHog (recorded decision)

- Single tool covers web + React Native + acquisition + product funnels + retention on one
  free tier. GA4/Firebase splits into two clunky consoles with weak funnels; Amplitude /
  Mixpanel are strong on product but weak on "where from" and need a second web tool.
- **Scope boundary (deferred):** PostHog does *not* do paid **install attribution** (which
  Meta/Google ad caused an app install). That needs a paid MMP (AppsFlyer / Adjust) plus
  store-referrer / SKAdNetwork plumbing. Deferred; we use UTM'd store links as the
  good-enough first pass.

## 3. Architecture

One PostHog project, two SDKs, one dashboard.

- **Web:** `posthog-js`, initialized in a client Provider mounted in the root layout.
  Autocapture (pageviews, clicks) plus manual pageview on App Router route change (the App
  Router does not fire a full navigation, so `posthog.capture('$pageview')` is called on
  path change). UTM params and referrer are captured automatically by `posthog-js`.
- **App:** `posthog-react-native` + `PostHogProvider` in `App.tsx`, with autocapture and
  navigation-based screen tracking. **Requires a dev-client rebuild** (`expo run:ios` /
  `expo run:android`), same as when `expo-clipboard` was added; it does not work in a plain
  Expo Go / OTA reload.
- **Identity stitching:** call `posthog.identify(userId)` on login and `posthog.reset()` on
  logout in both clients, so one person's web and app activity merges into a single profile.
- **Keep Vercel Analytics** (`<Analytics/>` already in the web layout) untouched.

## 4. Event taxonomy

Autocaptured for free (the "visitors + where from" ask): pageviews, unique visitors,
referrers, UTM source/medium/campaign, country, device, browser, entry/exit pages (web);
app opens, screen views, DAU/WAU/MAU, device/OS (app).

Explicitly instrumented (the "product behavior" ask). Same event names in both codebases so
funnels span web + app:

| Event | Fired when | Key properties |
|---|---|---|
| `signup_completed` | Account created | `role` (landlord/tenant/agent) |
| `property_added` | Landlord/agent adds a property | `propertyId` |
| `tenant_added` | Tenant added to a unit | `unitId` |
| `invoice_created` | Invoice generated | `invoiceId`, `amount` |
| `payment_recorded` | Rent payment recorded/settled | `amount`, `method` |
| `subscription_started` | Landlord subscribes | `plan` |
| `wallet_funded` | (Phase B) wallet DVA top-up | `amount` |

Web-only marketing events: `cta_clicked` (WhatsApp / request-demo buttons) with a
`location` property, so we can see which landing CTA converts.

Naming: `snake_case` events, no PII in properties beyond the internal `userId` used for
`identify`. Amounts are plain NGN numbers.

## 5. Privacy (Nigeria / NDPR)

- A small **dismissible cookie notice** on web (not a blocking GDPR-style gate). PostHog
  loads on page load; the notice informs and lets the user opt out, which calls
  `posthog.opt_out_capturing()`.
- **Session replay OFF** at launch (can enable later with input masking).
- Only `userId` on events; no names, emails, or phone numbers in event payloads.

## 6. Config

Public client key (safe to commit), EU host.

- **Web** (`.env.local` + Vercel project env):
  - `NEXT_PUBLIC_POSTHOG_KEY=phc_qW45f2M2fD88ptTYcAiWzmaMPwZUjtWGsCjNsngrCC82`
  - `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- **Mobile** (`app.config.ts` → `extra`):
  - `posthogKey: 'phc_qW45f2M2fD88ptTYcAiWzmaMPwZUjtWGsCjNsngrCC82'`
  - `posthogHost: 'https://eu.i.posthog.com'`
- Guard init on the key being present so a missing env var is a no-op, not a crash.

## 7. Rollout

Web and app are independent and ship separately.

- **Web:** integrate on the current web branch, deploys with that branch. Note: this branch
  reaches production only when it merges to `main`; if visitor tracking is wanted on the
  live site sooner, the change is small and can be cherry-picked to `main` on its own.
- **App:** integrate, then a dev-client rebuild + store re-submit (no OTA) to reach users.
- Verify events land in PostHog Live Events, then build the acquisition + funnel dashboards.

## 8. Testing (no test runner; manual, per repo convention)

- Web: run locally, load a page with `?utm_source=test`, confirm a `$pageview` with the UTM
  appears in PostHog Live Events; click a CTA, confirm `cta_clicked`; log in, confirm the
  person is `identify`'d.
- App: run the dev client, open a couple of screens, confirm app-open + screen events;
  perform a signup, confirm `signup_completed` and `identify`.
- Opt-out: dismiss/decline the web notice, confirm capture stops.

## 9. Open questions for review

1. **Web rollout target:** integrate on the current launch branch (goes live when it merges
   to `main`), or add PostHog directly on `main` now so the live site starts collecting
   visitor data immediately, independent of the launch?
2. **Order:** web first (fastest visible result), then app, or both together?
