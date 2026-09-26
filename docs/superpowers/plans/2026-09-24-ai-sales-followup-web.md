# AI Sales Follow-up, Phase 1 Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a "Sales follow-up" page (pause and preview controls, per-step A/B control, funnel, totals, journey list with timeline, stop/restart and hot badge), make the landlord billing page preselect a plan from `?plan=&interval=` links, and add the public confirmation pages for the one-click unsubscribe and opt-in email links.

**Architecture:** Plain additions to the existing `adminApi` object in `src/lib/admin.ts`, used from `useQuery`/`useMutation` in `"use client"` pages, with the page split into small components under `src/components/admin/sales-followup/`. The public email pages use a plain `fetch` client (same pattern as `newsletter-api.ts`) and call the backend from the browser on mount, so link scanners that prefetch the URL cannot act on it. Billing preselection only highlights and scrolls; it never starts checkout.

**Tech Stack:** Next.js 16 (app router), React 19, TanStack Query 5, axios, Tailwind v4.

**Repo:** `web/` (its own git repo, remote `apcexchange/property360`).

**Spec:** `docs/superpowers/specs/2026-09-24-ai-sales-followup-design.md`

**Depends on:** backend plan `docs/superpowers/plans/2026-09-24-ai-sales-followup-backend.md` (endpoints `GET /admin/sales-followup/stats`, `GET /admin/sales-followup/journeys`, `GET /admin/sales-followup/journeys/:id`, `PATCH /admin/sales-followup/settings`, `POST /admin/sales-followup/journeys/:id/stop`, `POST /admin/sales-followup/journeys/:id/restart`, public `GET /email/unsubscribe?token=` and `GET /email/opt-in?token=`; the backend builds email links to `${WEB_BASE_URL}/email/unsubscribe` and `/email/opt-in`, and AI plan links to `/app/billing?plan=<tier>&interval=<interval>`). Build against a backend running that branch.

---

## Before you start

- Worktree off the web branch that already has the tenant referral web work (`feat/tenant-referral-web`), on a new branch `feat/sales-followup-web`. Paths below are relative to `web/`.
- **No tests exist in web.** Verification is `npx tsc --noEmit` plus `npx eslint <files you touched>` after every task, then `npm run build` and the browser walkthrough in Task 10. `npm run lint` on the whole repo already reports 49 pre-existing problems in other files; this plan must not add any (lint the files you touch).
- UI conventions (admin): `Topbar`, `PageHeader`, `Pagination`, `StatCard`, `ErrorState`, `Drawer`, `Card`/`CardHeader`/`CardBody`, `SearchInput`/`Select`/`Button` from `@/components/admin/ui/*`, `DataTable`/`StatusBadge` from `@/components/admin/DataTable`, `formatDate`/`formatNgn` from `@/lib/format`. Query keys start with `["admin", "sales-followup", ...]` so one invalidation refreshes the page.
- **Writing rule:** no em dashes or en dashes anywhere (code, comments, UI copy). Use commas, colons or parentheses. Copy must never say or imply that Property360 collects rent.

### Decisions made while planning

1. The admin page lives under **Growth** in the sidebar (as the spec says), next to Tenant referrals, even though a separate "Sales" section (website sales leads) exists.
2. **Billing preselection** highlights the plan card with a ring and a "Suggested for you" badge, sets the interval from `?interval=`, scrolls to the card, and shows a short note; it never starts checkout by itself. It accepts `?plan=` and the older `?tier=` (pricing page links). `?plan=founding` highlights the Founding 50 card when it is showing.
3. **Plan links survive sign-in.** `AppAuthGate` now keeps the query string in `next`, and the login page lets `/app/billing?plan=...` through (other `/app/billing` `next` values still land on the dashboard, as today). Without this, a logged-out user tapping the AI's plan link would lose the preselection.
4. The email pages are **`/email/unsubscribe` and `/email/opt-in`**, separate from the existing newsletter page `/unsubscribe` (which unsubscribes by email address). They are `noindex` and call the backend on mount, not at build time.
5. The funnel shows raw counts plus percentages of "sent", and a separate Preview column for `dry_run` touches, so the preview week can be reviewed before going live.
6. **Go live** (turning preview off) asks for confirmation with `window.confirm`; pause and resume do not.
7. The drawer's **Restart** button is disabled for journeys stopped by the user's STOP and for converted journeys (the backend also refuses the first; the second would just be re-refused as "already on a paid plan").
8. Step names are mapped to readable labels in `labels.ts` (for example `post_trial_d3` shows as "Day 10: win-back email"); unknown keys fall back to the raw key, so a new backend step still renders.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/admin.ts` | modify | sales follow-up types and 6 API methods |
| `src/components/app/AuthGate.tsx` | modify | keep the query string when bouncing to login |
| `src/app/login/page.tsx` | modify | let `/app/billing?plan=` through after sign-in |
| `src/app/app/billing/page.tsx` | modify | preselect plan from `?plan=&interval=` |
| `src/lib/email-prefs-api.ts` | create | public unsubscribe / opt-in client |
| `src/components/email/EmailPreferencePage.tsx` | create | shared confirmation UI |
| `src/app/email/unsubscribe/page.tsx`, `src/app/email/opt-in/page.tsx` | create | routes |
| `src/components/admin/sales-followup/labels.ts` | create | labels for tracks, steps, statuses, skip reasons |
| `src/components/admin/sales-followup/ControlsCard.tsx` | create | pause, preview, per-step variant |
| `src/components/admin/sales-followup/FunnelTable.tsx` | create | funnel per track/step/variant/channel |
| `src/components/admin/sales-followup/JourneyDrawer.tsx` | create | journey detail, timeline, stop/restart |
| `src/app/admin/(app)/sales-followup/page.tsx` | create | the admin page |
| `src/components/admin/Sidebar.tsx` | modify | nav item |

---

### Task 1: Admin API types and methods

**Files:**
- Modify: `src/lib/admin.ts` (types before `AdminSalesLeadDetail`, methods before `updateSalesLead`)

The shapes mirror the backend `SalesFollowUpService.getStats`, `listJourneys`, `getJourneyDetail` and `updateSettings` responses (backend Task 21).

- [ ] **Step 1: Types**

Directly above `export interface AdminSalesLeadDetail {` add:

```ts
// ── AI sales follow-up ────────────────────────────────────────────────
export type SalesTrack = "trial" | "post_trial" | "cancelled" | "past_due";
export type SalesJourneyStatus = "active" | "paused_reply" | "converted" | "stopped" | "completed";
export type SalesVariant = "A" | "B";
export type StepVariantSetting = "ab" | "A" | "B";
export type SalesTouchStatus = "sent" | "delivered" | "failed" | "skipped" | "dry_run";

export interface SalesFollowUpSettings {
  paused: boolean;
  previewMode: boolean;
  stepVariants: Record<string, StepVariantSetting>;
}

export interface SalesStepInfo {
  key: string;
  track: SalesTrack;
  dayOffset: number;
  channel: "whatsapp" | "email" | "both";
  emailFallback: boolean;
  marketing: boolean;
  templateKey: string | null;
  emailKey: string | null;
  /** An approved Meta template name is configured for variant A / B. */
  whatsappA: boolean;
  whatsappB: boolean;
  variantSetting: StepVariantSetting;
}

export interface SalesFunnelRow {
  track: SalesTrack;
  stepKey: string;
  variant: SalesVariant;
  channel: "whatsapp" | "email";
  sent: number;
  delivered: number;
  failed: number;
  skipped: number;
  dryRun: number;
  replied: number;
  optedOut: number;
  subscribed: number;
}

export interface SalesFollowUpStats {
  settings: SalesFollowUpSettings;
  steps: SalesStepInfo[];
  totals: {
    activeJourneys: number;
    hotJourneys: number;
    conversionsThisMonth: number;
    conversionsViaChatThisMonth: number;
    revenueThisMonthNgn: number;
    conversionsAllTime: number;
    revenueAllTimeNgn: number;
  };
  funnel: SalesFunnelRow[];
}

export interface SalesJourneyRow {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
  } | null;
  track: SalesTrack;
  trackStartedAt: string;
  stepIndex: number;
  nextStepAt?: string;
  variant: SalesVariant;
  status: SalesJourneyStatus;
  stopReason?: string;
  stopNote?: string;
  hot: boolean;
  hotAt?: string;
  handoffSummary?: string;
  lastUserReplyAt?: string;
  lastWhatsappAt?: string;
  lastEmailAt?: string;
  whatsappUnpromptedCount: number;
  whatsappDisabled: boolean;
  emailUnsubscribed: boolean;
  lastPlanLink?: { tier: string; interval: string; at: string };
  convertedAt?: string;
  convertedAmountNgn?: number;
  attributedStep?: string;
  attributedToChat?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTouchRow {
  _id: string;
  stepKey: string;
  channel: "whatsapp" | "email";
  variant: SalesVariant;
  templateOrEmailKey: string;
  status: SalesTouchStatus;
  skipReason?: string;
  repliedAt?: string;
  optedOutAt?: string;
  convertedAt?: string;
  createdAt: string;
}

export interface SalesJourneyDetail {
  journey: SalesJourneyRow;
  touches: SalesTouchRow[];
  messages: {
    _id: string;
    role: "user" | "assistant";
    content: string;
    mode?: "normal" | "sales";
    createdAt: string;
  }[];
  subscription: {
    status: string;
    tier: string;
    trialEndsAt?: string | null;
    renewsAt?: string | null;
  } | null;
}
```

- [ ] **Step 2: Methods**

Inside `const adminApi = { ... }`, directly above `async updateSalesLead(leadId: string, status: string)`, add:

```ts
  async getSalesFollowUpStats(): Promise<SalesFollowUpStats> {
    const res = await api.get<ApiEnvelope<SalesFollowUpStats>>("/admin/sales-followup/stats");
    return unwrap(res.data);
  },

  async updateSalesFollowUpSettings(body: {
    paused?: boolean;
    previewMode?: boolean;
    stepVariants?: Record<string, StepVariantSetting>;
  }): Promise<SalesFollowUpSettings> {
    const res = await api.patch<ApiEnvelope<SalesFollowUpSettings>>("/admin/sales-followup/settings", body);
    return unwrap(res.data);
  },

  async listSalesJourneys(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    track?: string;
    hot?: boolean;
  }): Promise<Paginated<SalesJourneyRow>> {
    const res = await api.get<ApiEnvelope<Paginated<SalesJourneyRow>>>("/admin/sales-followup/journeys", {
      params: { ...params, hot: params.hot ? "true" : undefined },
    });
    return unwrap(res.data);
  },

  async getSalesJourney(id: string): Promise<SalesJourneyDetail> {
    const res = await api.get<ApiEnvelope<SalesJourneyDetail>>(`/admin/sales-followup/journeys/${id}`);
    return unwrap(res.data);
  },

  async stopSalesJourney(id: string): Promise<SalesJourneyRow> {
    const res = await api.post<ApiEnvelope<SalesJourneyRow>>(`/admin/sales-followup/journeys/${id}/stop`);
    return unwrap(res.data);
  },

  async restartSalesJourney(id: string): Promise<SalesJourneyRow> {
    const res = await api.post<ApiEnvelope<SalesJourneyRow>>(`/admin/sales-followup/journeys/${id}/restart`);
    return unwrap(res.data);
  },
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/admin.ts`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin.ts
git commit -m "feat(admin): add sales follow-up API client"
```

---

### Task 2: Keep plan links through sign-in

**Files:**
- Modify: `src/components/app/AuthGate.tsx` (`bounce`)
- Modify: `src/app/login/page.tsx` (`safeNext`)

- [ ] **Step 1: AuthGate keeps the query string**

In `src/components/app/AuthGate.tsx`:

Replace:

```tsx
    const bounce = () => {
      const next = encodeURIComponent(pathname || "/app");
      router.replace(`/login?next=${next}`);
    };
```

with:

```tsx
    const bounce = () => {
      // Keep the query string so deep links survive sign-in (e.g. the sales
      // assistant's one-tap /app/billing?plan=pro&interval=annual link).
      const next = encodeURIComponent((pathname || "/app") + window.location.search);
      router.replace(`/login?next=${next}`);
    };
```

(`bounce` only runs inside `useEffect`, so `window` is always defined.)

- [ ] **Step 2: Login lets plan links through**

In `src/app/login/page.tsx`, inside `safeNext`:

Replace:

```tsx
      if (nextParam.startsWith("/app/billing")) {
        return "/app/dashboard";
      }
```

with:

```tsx
      // Exception: a plan link (?plan=...) from the sales assistant or an
      // email should land on billing with that plan preselected.
      if (nextParam.startsWith("/app/billing")) {
        return nextParam.includes("plan=") ? nextParam : "/app/dashboard";
      }
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/app/AuthGate.tsx src/app/login/page.tsx`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/AuthGate.tsx src/app/login/page.tsx
git commit -m "feat(auth): keep billing plan links through sign-in"
```

---

### Task 3: Billing page preselects a plan

**Files:**
- Modify: `src/app/app/billing/page.tsx`

- [ ] **Step 1: Parse `?plan=`**

Replace:

```tsx
type CheckoutTier = "solo" | "pro" | "agency" | "founding";

```

with:

```tsx
type CheckoutTier = "solo" | "pro" | "agency" | "founding";

const CHECKOUT_TIERS: CheckoutTier[] = ["solo", "pro", "agency", "founding"];

/** ?plan= (sales assistant and email links) or the older ?tier= (pricing page). */
function parsePlanParam(raw: string | null | undefined): CheckoutTier | null {
  const v = (raw ?? "").toLowerCase();
  return (CHECKOUT_TIERS as string[]).includes(v) ? (v as CheckoutTier) : null;
}

```

Inside `BillingPage`:

Replace:

```tsx
  const initialInterval: BillingInterval = useMemo(() => {
    const v = searchParams?.get("interval");
    return v === "monthly" ? "monthly" : "annual";
  }, [searchParams]);

```

with:

```tsx
  const initialInterval: BillingInterval = useMemo(() => {
    const v = searchParams?.get("interval");
    return v === "monthly" ? "monthly" : "annual";
  }, [searchParams]);
  // ?plan=pro&interval=annual preselects (highlights and scrolls to) a plan.
  // It never starts checkout by itself: the user still taps Choose.
  const preselectedPlan: CheckoutTier | null = useMemo(
    () => parsePlanParam(searchParams?.get("plan") ?? searchParams?.get("tier")),
    [searchParams]
  );

```

- [ ] **Step 2: Scroll to the plan once loaded**

Replace:

```tsx
  useEffect(() => {
    // AppAuthGate (which wraps /app/*) has already enforced a valid
```

with:

```tsx
  useEffect(() => {
    if (loading || !sub || !preselectedPlan) return;
    document
      .getElementById(`plan-${preselectedPlan}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, sub, preselectedPlan]);

  useEffect(() => {
    // AppAuthGate (which wraps /app/*) has already enforced a valid
```

- [ ] **Step 3: Pass the preselection to the cards and show a note**

Replace:

```tsx
          <FoundingOfferCard
            status={foundingStatus}
            pending={pendingTier === "founding"}
```

with:

```tsx
          <FoundingOfferCard
            status={foundingStatus}
            preselected={preselectedPlan === "founding"}
            pending={pendingTier === "founding"}
```

Replace:

```tsx
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>

```

with:

```tsx
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>

        {preselectedPlan && preselectedPlan !== "founding" && (
          <p className="mt-4 rounded-2xl border border-cryola-300/60 bg-cryola-50 px-4 py-3 text-[13.5px] text-foundation-700">
            We&apos;ve highlighted the{" "}
            <strong className="font-semibold capitalize">{preselectedPlan}</strong> plan
            {interval === "annual" ? " (annual)" : " (monthly)"} for you. Tap{" "}
            <strong className="font-semibold">Choose</strong> on it to continue to secure checkout.
          </p>
        )}

```

Replace:

```tsx
              currentInterval={sub.billingInterval}
              pending={pendingTier === tier.name.toLowerCase()}
```

with:

```tsx
              currentInterval={sub.billingInterval}
              preselected={preselectedPlan === tier.name.toLowerCase()}
              pending={pendingTier === tier.name.toLowerCase()}
```

- [ ] **Step 4: PlanCard highlight**

Replace:

```tsx
function PlanCard({
  tier,
  interval,
  currentTier,
  currentInterval,
  pending,
  disabled,
  onSelect,
}: {
  tier: Tier;
  interval: BillingInterval;
  currentTier: string;
  currentInterval: BillingInterval;
  pending: boolean;
  disabled: boolean;
  onSelect?: () => void;
}) {
```

with:

```tsx
function PlanCard({
  tier,
  interval,
  currentTier,
  currentInterval,
  preselected,
  pending,
  disabled,
  onSelect,
}: {
  tier: Tier;
  interval: BillingInterval;
  currentTier: string;
  currentInterval: BillingInterval;
  preselected: boolean;
  pending: boolean;
  disabled: boolean;
  onSelect?: () => void;
}) {
```

Replace:

```tsx
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        isHighlight
          ? "border-foundation-700 bg-foundation-700 text-paper"
          : "border-foundation-700/10 bg-surface text-foundation-700"
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-6 rounded-full bg-cryola-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foundation-700">
          Your plan
        </span>
      )}
```

with:

```tsx
  return (
    <div
      id={`plan-${tier.name.toLowerCase()}`}
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        isHighlight
          ? "border-foundation-700 bg-foundation-700 text-paper"
          : "border-foundation-700/10 bg-surface text-foundation-700"
      } ${preselected && !isCurrent ? "ring-4 ring-cryola-300 ring-offset-2 ring-offset-canvas" : ""}`}
    >
      {isCurrent ? (
        <span className="absolute -top-3 left-6 rounded-full bg-cryola-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foundation-700">
          Your plan
        </span>
      ) : preselected ? (
        <span className="absolute -top-3 left-6 rounded-full bg-cryola-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foundation-700">
          Suggested for you
        </span>
      ) : null}
```

- [ ] **Step 5: Founding card highlight**

Replace:

```tsx
function FoundingOfferCard({
  status,
  pending,
  disabled,
  onClaim,
}: {
  status: FoundingStatus;
  pending: boolean;
  disabled: boolean;
  onClaim: () => void;
}) {
```

with:

```tsx
function FoundingOfferCard({
  status,
  preselected,
  pending,
  disabled,
  onClaim,
}: {
  status: FoundingStatus;
  preselected: boolean;
  pending: boolean;
  disabled: boolean;
  onClaim: () => void;
}) {
```

Replace:

```tsx
    <section className="mx-auto max-w-6xl px-6 pt-8">
      <div className="relative overflow-hidden rounded-2xl border border-cryola-300/20 bg-foundation-700 p-6 text-paper shadow-card sm:p-7">
```

with:

```tsx
    <section id="plan-founding" className="mx-auto max-w-6xl px-6 pt-8">
      <div
        className={`relative overflow-hidden rounded-2xl border border-cryola-300/20 bg-foundation-700 p-6 text-paper shadow-card sm:p-7 ${
          preselected ? "ring-4 ring-cryola-300 ring-offset-2 ring-offset-canvas" : ""
        }`}
      >
```

The inner `</div>` and `</section>` that close this card stay as they are.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/app/billing/page.tsx`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/billing/page.tsx
git commit -m "feat(billing): preselect a plan from ?plan=&interval="
```

---

### Task 4: Public email preference client and unsubscribe page

**Files:**
- Create: `src/lib/email-prefs-api.ts`
- Create: `src/components/email/EmailPreferencePage.tsx`
- Create: `src/app/email/unsubscribe/page.tsx`

- [ ] **Step 1: Client**

`src/lib/email-prefs-api.ts`:

```ts
"use client";

import { API_BASE_URL } from "./api";

/**
 * One-click links from Property360 sales emails. Public endpoints (no auth):
 * the signed token in the link is the only credential, so a plain fetch keeps
 * these pages independent of the session stack. The pages call these from
 * the browser (not at build or prefetch time), so email link scanners that
 * only fetch the URL do not unsubscribe anyone. Never throws.
 */
export type EmailPrefAction = "unsubscribe" | "opt-in";

export async function applyEmailPreference(
  action: EmailPrefAction,
  token: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/email/${action}?token=${encodeURIComponent(token)}`);
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error, please try again." };
  }
}
```

- [ ] **Step 2: Shared confirmation UI**

`src/components/email/EmailPreferencePage.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyEmailPreference, EmailPrefAction } from "@/lib/email-prefs-api";

interface Copy {
  loading: string;
  doneTitle: string;
  doneBody: string;
}

const COPY: Record<EmailPrefAction, Copy> = {
  unsubscribe: {
    loading: "Unsubscribing…",
    doneTitle: "You're unsubscribed",
    doneBody:
      "You won't get any more tips, offers or follow-up emails from Property360. Account emails such as receipts and security codes still arrive as normal.",
  },
  "opt-in": {
    loading: "Saving your choice…",
    doneTitle: "You're on the list",
    doneBody:
      "We'll send you occasional tips for landlords and the odd offer. Every email has a one-click unsubscribe link.",
  },
};

function EmailPreferenceInner({ action }: { action: EmailPrefAction }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "done" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    applyEmailPreference(action, token).then((res) => {
      if (cancelled) return;
      setMessage(res.message);
      setState(res.ok ? "done" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, [action, token]);

  const copy = COPY[action];
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-tight text-foundation-700">
        {state === "loading" ? copy.loading : state === "done" ? copy.doneTitle : "This link didn't work"}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {state === "done"
          ? copy.doneBody
          : state === "error"
          ? `${message ?? "The link may be incomplete or out of date."} Email hello@property360.africa and we'll sort it out.`
          : "One moment."}
      </p>
      <Link href="/" className="mt-6 text-[14px] font-semibold text-cryola-500 hover:underline">
        Back to property360.africa
      </Link>
    </main>
  );
}

/** Confirmation page for the signed links in sales emails. */
export function EmailPreferencePage({ action }: { action: EmailPrefAction }) {
  return (
    <Suspense fallback={null}>
      <EmailPreferenceInner action={action} />
    </Suspense>
  );
}
```

- [ ] **Step 3: Unsubscribe route**

`src/app/email/unsubscribe/page.tsx`:

```tsx
import type { Metadata } from "next";
import { EmailPreferencePage } from "@/components/email/EmailPreferencePage";

export const metadata: Metadata = {
  title: "Unsubscribe | Property360",
  robots: { index: false, follow: false },
};

export default function EmailUnsubscribePage() {
  return <EmailPreferencePage action="unsubscribe" />;
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/lib/email-prefs-api.ts src/components/email src/app/email`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email-prefs-api.ts src/components/email/EmailPreferencePage.tsx src/app/email/unsubscribe/page.tsx
git commit -m "feat(email): add one-click unsubscribe page for sales emails"
```

---

### Task 5: Opt-in confirmation page

**Files:**
- Create: `src/app/email/opt-in/page.tsx`

The welcome email's "Keep me posted with tips and offers" button links here.

- [ ] **Step 1: Route**

`src/app/email/opt-in/page.tsx`:

```tsx
import type { Metadata } from "next";
import { EmailPreferencePage } from "@/components/email/EmailPreferencePage";

export const metadata: Metadata = {
  title: "Tips and offers | Property360",
  robots: { index: false, follow: false },
};

export default function EmailOptInPage() {
  return <EmailPreferencePage action="opt-in" />;
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/app/email`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/email/opt-in/page.tsx
git commit -m "feat(email): add tips and offers opt-in page"
```

---

### Task 6: Labels and the controls card

**Files:**
- Create: `src/components/admin/sales-followup/labels.ts`
- Create: `src/components/admin/sales-followup/ControlsCard.tsx`

- [ ] **Step 1: Labels**

`src/components/admin/sales-followup/labels.ts`:

```ts
import type { SalesJourneyStatus, SalesTrack } from "@/lib/admin";

/** Human labels for the backend's schedule keys (backend: src/utils/salesFollowUp/schedule.ts). */
export const TRACK_LABELS: Record<SalesTrack, string> = {
  trial: "Trial",
  post_trial: "After trial",
  cancelled: "Cancelled",
  past_due: "Payment failed",
};

const STEP_LABELS: Record<string, string> = {
  trial_d0_welcome: "Day 0: welcome",
  trial_d1_setup: "Day 1: setup nudge",
  trial_d3_value: "Day 3: value email",
  trial_d5_ending: "Day 5: trial ending",
  trial_d7_ended: "Day 7: trial ended",
  post_trial_d3: "Day 10: win-back email",
  post_trial_d7: "Day 14: win-back WhatsApp",
  post_trial_d14: "Day 21: win-back email",
  post_trial_d23: "Day 30: win-back WhatsApp",
  post_trial_m1: "Month 2 email",
  post_trial_m2: "Month 3 email",
  post_trial_m3: "Month 4 email",
  post_trial_m4: "Month 5 email",
  post_trial_m5: "Month 6 email",
  post_trial_m6: "Month 7 email",
  past_due_d0: "Day 0: payment failed",
  past_due_d3: "Day 3: payment reminder",
  cancelled_d7: "Day 7: win-back",
  cancelled_d30: "Day 30: win-back",
};

export function stepLabel(key: string): string {
  return STEP_LABELS[key] ?? key.replace(/_/g, " ");
}

export const STATUS_LABELS: Record<SalesJourneyStatus, string> = {
  active: "Active",
  paused_reply: "Paused (replied)",
  converted: "Subscribed",
  stopped: "Stopped",
  completed: "Completed",
};

export const STOP_REASON_LABELS: Record<string, string> = {
  subscribed: "Subscribed",
  opt_out: "Replied STOP",
  not_interested: "Not interested",
  undeliverable: "Undeliverable",
  admin: "Stopped by admin",
  deleted: "Account deleted",
};

export const SKIP_REASON_LABELS: Record<string, string> = {
  condition: "Condition not met",
  no_phone: "No phone",
  whatsapp_disabled: "WhatsApp disabled (failures)",
  whatsapp_opted_out: "WhatsApp updates off",
  whatsapp_cap: "WhatsApp cap reached",
  no_template: "Template not approved yet",
  email_not_configured: "Email not configured",
  email_unverified: "Email not verified",
  email_unsubscribed: "Unsubscribed from emails",
  no_marketing_consent: "No marketing consent",
  provider_error: "Provider error",
  delivery_failed: "Delivery failed",
  master_switch_off: "WhatsApp switched off",
  provider_not_configured: "WhatsApp not configured",
  no_template_id: "Template not configured",
};

export function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
```

The step keys and skip reasons match the backend's `src/utils/salesFollowUp/schedule.ts` and `channels.ts`.

- [ ] **Step 2: Controls card**

`src/components/admin/sales-followup/ControlsCard.tsx`:

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import { Button, Select } from "@/components/admin/ui/Filters";
import adminApi, { SalesFollowUpSettings, SalesStepInfo, StepVariantSetting } from "@/lib/admin";
import { stepLabel, TRACK_LABELS } from "./labels";

/**
 * Pause and preview switches plus the per-step A/B control. Preview mode is
 * the safe default: every send is recorded as a dry run and nothing reaches
 * users. Turning it off asks for confirmation.
 */
export function ControlsCard({ settings, steps }: { settings: SalesFollowUpSettings; steps: SalesStepInfo[] }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateSalesFollowUpSettings>[0]) =>
      adminApi.updateSalesFollowUpSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sales-followup"] }),
  });

  function togglePreview() {
    if (settings.previewMode) {
      const ok = window.confirm(
        "Go live? Real WhatsApp messages and emails will be sent to landlords and agents on the next run (every 15 minutes)."
      );
      if (!ok) return;
    }
    save.mutate({ previewMode: !settings.previewMode });
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Controls"
        description="Pause stops every scheduled send. Preview records what would be sent without sending it."
      />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${
              settings.paused ? "text-error" : "text-foundation-700"
            }`}
          >
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${settings.paused ? "bg-error" : "bg-cryola-500"}`}
            />
            {settings.paused ? "Paused" : "Running"}
          </span>
          <span
            className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
              settings.previewMode ? "text-amber-800" : "text-foundation-700"
            }`}
          >
            {settings.previewMode ? "Preview mode (nothing is sent)" : "Live"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant={settings.paused ? "success" : "danger"}
              disabled={save.isPending}
              onClick={() => save.mutate({ paused: !settings.paused })}
            >
              {settings.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant={settings.previewMode ? "primary" : "secondary"} disabled={save.isPending} onClick={togglePreview}>
              {settings.previewMode ? "Go live" : "Back to preview"}
            </Button>
          </div>
        </div>
        {save.isError && (
          <p className="text-[12.5px] text-error">Couldn&apos;t save: {(save.error as Error).message}</p>
        )}

        <div className="overflow-x-auto border border-rule">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule bg-paper-deep/40 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foundation-700">
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">WhatsApp template</th>
                <th className="px-3 py-2">Variant</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.key} className="border-b border-rule last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foundation-700">{stepLabel(s.key)}</div>
                    <div className="text-[11.5px] text-ink-muted">
                      {TRACK_LABELS[s.track]}
                      {s.marketing ? ", marketing" : ", utility"}
                    </div>
                  </td>
                  <td className="px-3 py-2 capitalize text-ink-body">
                    {s.channel}
                    {s.emailFallback ? " (email fallback)" : ""}
                  </td>
                  <td className="px-3 py-2 text-ink-body">
                    {s.templateKey ? (
                      <span>
                        A: {s.whatsappA ? "approved" : "not set"}, B: {s.whatsappB ? "approved" : "not set"}
                      </span>
                    ) : (
                      <span className="text-ink-faint">Email only</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={s.variantSetting}
                      onChange={(v) => save.mutate({ stepVariants: { [s.key]: v as StepVariantSetting } })}
                    >
                      <option value="ab">A/B split</option>
                      <option value="A">Always A</option>
                      <option value="B">Always B</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/sales-followup`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/sales-followup/labels.ts src/components/admin/sales-followup/ControlsCard.tsx
git commit -m "feat(admin): add sales follow-up controls card"
```

---

### Task 7: Funnel table

**Files:**
- Create: `src/components/admin/sales-followup/FunnelTable.tsx`

- [ ] **Step 1: Component**

`src/components/admin/sales-followup/FunnelTable.tsx`:

```tsx
import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import type { SalesFunnelRow } from "@/lib/admin";
import { pct, stepLabel, TRACK_LABELS } from "./labels";

/**
 * Funnel per track, step, variant and channel. "Subscribed" counts paid
 * activations within 7 days that were attributed to that touch.
 */
export function FunnelTable({ rows }: { rows: SalesFunnelRow[] }) {
  return (
    <Card className="mb-6">
      <CardHeader
        title="Funnel"
        description="Per step and variant. Preview rows show what would have been sent."
      />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-ink-muted">No touches yet. The first run happens within 15 minutes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-foundation-700 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foundation-700">
                  <th className="px-4 py-2.5">Step</th>
                  <th className="px-3 py-2.5">Var.</th>
                  <th className="px-3 py-2.5">Channel</th>
                  <th className="px-3 py-2.5 text-right">Sent</th>
                  <th className="px-3 py-2.5 text-right">Delivered</th>
                  <th className="px-3 py-2.5 text-right">Replied</th>
                  <th className="px-3 py-2.5 text-right">Opted out</th>
                  <th className="px-3 py-2.5 text-right">Subscribed (7d)</th>
                  <th className="px-3 py-2.5 text-right">Preview</th>
                  <th className="px-3 py-2.5 text-right">Skipped</th>
                  <th className="px-4 py-2.5 text-right">Failed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.stepKey}-${r.variant}-${r.channel}`} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foundation-700">{stepLabel(r.stepKey)}</div>
                      <div className="text-[11.5px] text-ink-muted">{TRACK_LABELS[r.track]}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{r.variant}</td>
                    <td className="px-3 py-2.5 capitalize">{r.channel}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.sent}</td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {r.channel === "whatsapp" ? `${r.delivered} (${pct(r.delivered, r.sent)})` : "n/a"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {r.replied} ({pct(r.replied, r.sent)})
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{r.optedOut}</td>
                    <td className="px-3 py-2.5 text-right tabular font-semibold text-foundation-700">
                      {r.subscribed} ({pct(r.subscribed, r.sent)})
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-amber-800">{r.dryRun}</td>
                    <td className="px-3 py-2.5 text-right tabular text-ink-muted">{r.skipped}</td>
                    <td className="px-4 py-2.5 text-right tabular text-error">{r.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/sales-followup`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sales-followup/FunnelTable.tsx
git commit -m "feat(admin): add sales follow-up funnel table"
```

---

### Task 8: Journey drawer with timeline

**Files:**
- Create: `src/components/admin/sales-followup/JourneyDrawer.tsx`

- [ ] **Step 1: Component**

`src/components/admin/sales-followup/JourneyDrawer.tsx`:

```tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Filters";
import { StatusBadge } from "@/components/admin/DataTable";
import adminApi, { SalesJourneyDetail } from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";
import { SKIP_REASON_LABELS, STATUS_LABELS, STOP_REASON_LABELS, stepLabel, TRACK_LABELS } from "./labels";

type TimelineItem =
  | { kind: "touch"; at: string; touch: SalesJourneyDetail["touches"][number] }
  | { kind: "message"; at: string; message: SalesJourneyDetail["messages"][number] };

function formatDateTime(raw?: string | null): string {
  if (!raw) return "n/a";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function timeline(d: SalesJourneyDetail): TimelineItem[] {
  const items: TimelineItem[] = [
    ...d.touches.map((touch) => ({ kind: "touch" as const, at: touch.createdAt, touch })),
    ...d.messages.map((message) => ({ kind: "message" as const, at: message.createdAt, message })),
  ];
  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** Journey detail: state, timeline of touches and WhatsApp chat, stop and restart. */
export function JourneyDrawer({ journeyId, onClose }: { journeyId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "sales-followup", "journey", journeyId],
    queryFn: () => adminApi.getSalesJourney(journeyId as string),
    enabled: journeyId !== null,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "sales-followup"] });
  const stop = useMutation({ mutationFn: (id: string) => adminApi.stopSalesJourney(id), onSuccess: refresh });
  const restart = useMutation({ mutationFn: (id: string) => adminApi.restartSalesJourney(id), onSuccess: refresh });
  const actionError = (stop.error ?? restart.error) as AxiosError<{ message?: string }> | null;

  const d = detail.data;
  const j = d?.journey;
  const name = j?.user ? `${j.user.firstName} ${j.user.lastName}` : "Deleted user";

  return (
    <Drawer
      open={journeyId !== null}
      onClose={onClose}
      title={j ? name : "Loading…"}
      subtitle={j?.user ? [j.user.email, j.user.phone, j.user.role].filter(Boolean).join(" · ") : undefined}
      width="xl"
      footer={
        j && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-error">
              {actionError ? actionError.response?.data?.message ?? actionError.message : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={stop.isPending || j.status === "stopped" || j.status === "converted"}
                onClick={() => stop.mutate(j._id)}
              >
                Stop
              </Button>
              <Button
                variant="success"
                disabled={restart.isPending || j.stopReason === "opt_out" || j.status === "converted"}
                onClick={() => restart.mutate(j._id)}
              >
                Restart
              </Button>
            </div>
          </div>
        )
      }
    >
      {detail.isLoading || !d || !j ? (
        <p className="text-[13.5px] text-ink-muted">Loading journey…</p>
      ) : (
        <div className="space-y-6">
          {j.hot && (
            <div className="border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-foundation-700">
              <p className="font-semibold text-error">Hot lead, handed to the team {formatDateTime(j.hotAt)}</p>
              {j.handoffSummary && <p className="mt-1">{j.handoffSummary}</p>}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Track</dt>
              <dd className="mt-0.5 text-foundation-700">{TRACK_LABELS[j.track]}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Status</dt>
              <dd className="mt-0.5 text-foundation-700">
                {STATUS_LABELS[j.status]}
                {j.stopReason ? ` (${STOP_REASON_LABELS[j.stopReason] ?? j.stopReason})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Next step</dt>
              <dd className="mt-0.5 text-foundation-700">{j.nextStepAt ? formatDateTime(j.nextStepAt) : "None"}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Variant</dt>
              <dd className="mt-0.5 font-mono text-foundation-700">{j.variant}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">WhatsApp</dt>
              <dd className="mt-0.5 text-foundation-700">
                {j.whatsappUnpromptedCount} of 6 sent{j.whatsappDisabled ? ", disabled after failures" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Email</dt>
              <dd className="mt-0.5 text-foundation-700">{j.emailUnsubscribed ? "Unsubscribed" : "Subscribed"}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Subscription</dt>
              <dd className="mt-0.5 text-foundation-700">
                {d.subscription ? `${d.subscription.tier}, ${d.subscription.status.replace(/_/g, " ")}` : "None yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Last plan link</dt>
              <dd className="mt-0.5 text-foundation-700">
                {j.lastPlanLink ? `${j.lastPlanLink.tier} ${j.lastPlanLink.interval}` : "None"}
              </dd>
            </div>
            {j.convertedAt && (
              <div className="col-span-2">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Converted</dt>
                <dd className="mt-0.5 text-foundation-700">
                  {formatDate(j.convertedAt)}, {formatNgn(j.convertedAmountNgn ?? 0)}
                  {j.attributedStep ? `, after ${stepLabel(j.attributedStep)}` : ""}
                  {j.attributedToChat ? ", chatted with the AI" : ""}
                </dd>
              </div>
            )}
            {j.stopNote && (
              <div className="col-span-2">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Note</dt>
                <dd className="mt-0.5 text-foundation-700">{j.stopNote}</dd>
              </div>
            )}
          </dl>

          <div>
            <h4 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700">Timeline</h4>
            {timeline(d).length === 0 ? (
              <p className="text-[13px] text-ink-muted">Nothing yet.</p>
            ) : (
              <ol className="space-y-2">
                {timeline(d).map((item) =>
                  item.kind === "touch" ? (
                    <li key={`t-${item.touch._id}`} className="border border-rule bg-paper-deep/30 px-3 py-2 text-[12.5px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foundation-700">
                          {stepLabel(item.touch.stepKey)} · {item.touch.channel} · {item.touch.variant}
                        </span>
                        <StatusBadge value={item.touch.status} />
                      </div>
                      <div className="mt-0.5 text-ink-muted">
                        {formatDateTime(item.at)} · {item.touch.templateOrEmailKey}
                        {item.touch.skipReason
                          ? ` · ${SKIP_REASON_LABELS[item.touch.skipReason] ?? item.touch.skipReason}`
                          : ""}
                        {item.touch.repliedAt ? " · replied" : ""}
                        {item.touch.optedOutAt ? " · opted out" : ""}
                        {item.touch.convertedAt ? " · subscribed" : ""}
                      </div>
                    </li>
                  ) : (
                    <li
                      key={`m-${item.message._id}`}
                      className={`flex ${item.message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-[13px] ${
                          item.message.role === "user"
                            ? "bg-foundation-700 text-paper"
                            : "border border-rule bg-surface text-foundation-700"
                        }`}
                      >
                        {item.message.content}
                        <p className="mt-1 text-[10px] opacity-60">
                          {formatDateTime(item.at)}
                          {item.message.mode === "sales" ? " · sales mode" : ""}
                        </p>
                      </div>
                    </li>
                  )
                )}
              </ol>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
```

Backend errors (for example the 409 "only they can restart messages by replying START") show in the drawer footer.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/sales-followup`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sales-followup/JourneyDrawer.tsx
git commit -m "feat(admin): add sales journey drawer with timeline"
```

---

### Task 9: Sales follow-up page and nav item

**Files:**
- Create: `src/app/admin/(app)/sales-followup/page.tsx`
- Modify: `src/components/admin/Sidebar.tsx` (Growth section)

- [ ] **Step 1: Page**

`src/app/admin/(app)/sales-followup/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { StatCard } from "@/components/admin/ui/StatCard";
import { ErrorState } from "@/components/admin/ui/ErrorState";
import { Button, SearchInput, Select } from "@/components/admin/ui/Filters";
import { ControlsCard } from "@/components/admin/sales-followup/ControlsCard";
import { FunnelTable } from "@/components/admin/sales-followup/FunnelTable";
import { JourneyDrawer } from "@/components/admin/sales-followup/JourneyDrawer";
import { STATUS_LABELS, STOP_REASON_LABELS, TRACK_LABELS } from "@/components/admin/sales-followup/labels";
import adminApi, { SalesJourneyRow } from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

function HotBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
      Hot
    </span>
  );
}

export default function AdminSalesFollowUpPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [track, setTrack] = useState("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const limit = 25;

  const stats = useQuery({
    queryKey: ["admin", "sales-followup", "stats"],
    queryFn: () => adminApi.getSalesFollowUpStats(),
  });

  const journeys = useQuery({
    queryKey: ["admin", "sales-followup", "journeys", { page, search, status, track, hotOnly }],
    queryFn: () =>
      adminApi.listSalesJourneys({
        page,
        limit,
        search: search.trim() || undefined,
        status,
        track,
        hot: hotOnly,
      }),
    placeholderData: keepPreviousData,
  });

  const t = stats.data?.totals;

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            eyebrow="Growth"
            title="Sales follow-up"
            description="Automated WhatsApp and email follow-up for landlords and agents who are not paying yet, plus the AI sales chat."
          />

          {stats.isError ? (
            <ErrorState title="Could not load sales follow-up" onRetry={() => void stats.refetch()} />
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Active journeys"
                  loading={stats.isLoading}
                  value={t?.activeJourneys ?? 0}
                  hint={t ? `${t.hotJourneys} hot` : undefined}
                />
                <StatCard
                  label="Conversions this month"
                  loading={stats.isLoading}
                  value={t?.conversionsThisMonth ?? 0}
                  hint={t ? `${t.conversionsViaChatThisMonth} after an AI chat` : undefined}
                />
                <StatCard
                  label="Revenue this month"
                  loading={stats.isLoading}
                  value={formatNgn(t?.revenueThisMonthNgn ?? 0)}
                />
                <StatCard
                  label="Revenue all time"
                  loading={stats.isLoading}
                  value={formatNgn(t?.revenueAllTimeNgn ?? 0)}
                  hint={t ? `${t.conversionsAllTime} conversions` : undefined}
                />
              </div>

              {stats.data && <ControlsCard settings={stats.data.settings} steps={stats.data.steps} />}
              {stats.data && <FunnelTable rows={stats.data.funnel} />}
            </>
          )}

          <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-display text-[20px] font-medium text-foundation-700">Journeys</h3>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Name, email or phone"
              className="w-56"
            />
            <Select
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <option value="all">Any status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={track}
              onChange={(v) => {
                setTrack(v);
                setPage(1);
              }}
            >
              <option value="all">Any track</option>
              {Object.entries(TRACK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button
              variant={hotOnly ? "primary" : "secondary"}
              onClick={() => {
                setHotOnly((h) => !h);
                setPage(1);
              }}
            >
              Hot only
            </Button>
          </div>

          <DataTable<SalesJourneyRow>
            loading={journeys.isLoading}
            rows={journeys.data?.items ?? []}
            empty="No journeys yet"
            emptyDescription="Journeys start when landlords or agents sign up, or after the backfill script runs."
            onRowClick={(r) => setViewingId(r._id)}
            columns={[
              {
                key: "user",
                header: "User",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {r.user ? `${r.user.firstName} ${r.user.lastName}` : "Deleted user"}
                      {r.hot && <HotBadge />}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {r.user ? [r.user.email, r.user.phone].filter(Boolean).join(" · ") : ""}
                    </div>
                  </div>
                ),
              },
              { key: "role", header: "Role", render: (r) => <span className="capitalize">{r.user?.role ?? "?"}</span> },
              { key: "track", header: "Track", render: (r) => TRACK_LABELS[r.track] },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <div>
                    <div>{STATUS_LABELS[r.status]}</div>
                    {r.stopReason && (
                      <div className="text-xs text-ink-muted">{STOP_REASON_LABELS[r.stopReason] ?? r.stopReason}</div>
                    )}
                  </div>
                ),
              },
              { key: "variant", header: "Var.", render: (r) => <span className="font-mono">{r.variant}</span> },
              { key: "next", header: "Next step", render: (r) => (r.nextStepAt ? formatDate(r.nextStepAt) : "None") },
              {
                key: "reply",
                header: "Last reply",
                render: (r) => (r.lastUserReplyAt ? formatDate(r.lastUserReplyAt) : "None"),
              },
            ]}
          />
          <Pagination page={page} total={journeys.data?.total ?? 0} limit={limit} onChange={setPage} />
        </div>
      </main>

      <JourneyDrawer journeyId={viewingId} onClose={() => setViewingId(null)} />
    </>
  );
}
```

- [ ] **Step 2: Nav item**

In `src/components/admin/Sidebar.tsx`:

Replace:

```ts
      { href: "/admin/tenant-referrals", label: "Tenant referrals" },
    ],
```

with:

```ts
      { href: "/admin/tenant-referrals", label: "Tenant referrals" },
      { href: "/admin/sales-followup", label: "Sales follow-up" },
    ],
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint "src/app/admin/(app)/sales-followup" src/components/admin/Sidebar.tsx`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(app)/sales-followup/page.tsx" src/components/admin/Sidebar.tsx
git commit -m "feat(admin): add sales follow-up page"
```

---

### Task 10: Verify and ship

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npm run build`
Expected: both pass. Then run `npx eslint src/lib/admin.ts src/lib/email-prefs-api.ts src/components/app/AuthGate.tsx src/app/login/page.tsx src/app/app/billing/page.tsx src/components/email src/app/email src/components/admin/sales-followup "src/app/admin/(app)/sales-followup" src/components/admin/Sidebar.tsx`: expected no output. (`npm run lint` on the whole repo still shows only the 49 pre-existing problems.)

- [ ] **Step 2: Browser walkthrough** (backend on the sales-followup branch with preview mode on, `NEXT_PUBLIC_API_URL` pointing at it, `npm run dev`)

As admin:
1. Sidebar, Growth shows **Sales follow-up**. The page loads with four stat cards, the Controls card showing "Running" and "Preview mode (nothing is sent)", 19 steps with their channel, template status and a variant select, the Funnel card, and the Journeys table.
2. Change a step's variant to "Always B": the select keeps the value after the refetch.
3. Pause, then Resume: the status label flips each time. Click "Go live", cancel the confirm: nothing changes.
4. Register a test landlord (backend walkthrough Task 30 Step 4): after a refresh the journey appears; search by their email finds it; "Hot only" hides it.
5. Click the row: the drawer shows track, status, next step, variant, WhatsApp count and the timeline. After the backend walkthrough steps, the timeline shows the preview touches, the WhatsApp messages with "sales mode" markers, and a Hot banner after a handoff. Stop sets "Stopped (Stopped by admin)"; for a journey stopped by STOP, Restart is disabled.
6. The Funnel card shows the `trial_d0_welcome` rows with counts in the Preview column.

As a landlord:
7. Open `/app/billing?plan=pro&interval=annual` while signed in: the Pro card has a ring and "Suggested for you", the interval toggle is on annual, the page scrolls to it and the note is shown. Nothing redirects to Paystack until you tap Choose Pro.
8. Sign out, open the same URL: you land on `/login?next=...`; after signing in you land on the billing page with Pro preselected.
9. `/app/billing?plan=founding` highlights the Founding 50 card when the offer is live.

Public pages:
10. Open `/email/unsubscribe?token=<valid unsub token from the backend walkthrough Task 30 Step 9>`: "You're unsubscribed". With the token altered: "This link didn't work" plus the backend message.
11. Open `/email/opt-in?token=<valid opt-in token>` (sign one with purpose `optin`): "You're on the list". Opening `/email/unsubscribe` with no token shows the error state without calling the API.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/sales-followup-web
gh pr create --base main --title "feat(admin): sales follow-up page, billing plan preselect, email preference pages" --body "Implements docs/superpowers/specs/2026-09-24-ai-sales-followup-design.md (web). Requires the backend sales-followup PR to be deployed first."
```
