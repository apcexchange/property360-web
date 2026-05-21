"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";
import { Check, ExternalLink, AlertTriangle } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { TIERS, Tier } from "@/components/marketing/PricingTable";
import { IntervalToggle } from "@/components/marketing/IntervalToggle";
import {
  billingApi,
  SubscriptionView,
  SubscriptionResponse,
  BillingInterval,
} from "@/lib/billing-api";
import { session } from "@/lib/session";
import { API_BASE_URL } from "@/lib/api";

type CheckoutTier = "solo" | "pro" | "agency";

interface LoadError {
  kind: "not-found" | "network" | "unknown";
  message: string;
  status?: number;
}

function classifyError(err: unknown): LoadError {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const axErr = err as AxiosError;
    const status = axErr.response?.status;
    if (!axErr.response) {
      return {
        kind: "network",
        message:
          "Could not reach the subscription service. Check that the API is online and try again.",
      };
    }
    if (status === 404) {
      return {
        kind: "not-found",
        status,
        message:
          "The subscription service isn't available on this backend. Confirm the API at the address below has the latest deploy.",
      };
    }
    return {
      kind: "unknown",
      status,
      message:
        (axErr.response.data as { message?: string } | undefined)?.message ??
        "Something went wrong loading your subscription.",
    };
  }
  return {
    kind: "unknown",
    message: err instanceof Error ? err.message : String(err),
  };
}

export default function BillingPage() {
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [pendingTier, setPendingTier] = useState<CheckoutTier | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await billingApi.getSubscription();
      setSub(data);
    } catch (err) {
      setLoadError(classifyError(err));
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session.getToken()) {
      router.replace("/billing/login?next=/billing");
      return;
    }
    void load();
  }, [router, load]);

  function signOut() {
    session.clear();
    router.replace("/billing/login?next=/billing");
  }

  async function startCheckout(tier: CheckoutTier) {
    setPendingTier(tier);
    setActionError(null);
    try {
      const { authorizationUrl } = await billingApi.createCheckout(tier, interval);
      window.location.href = authorizationUrl;
    } catch (err) {
      setActionError(classifyError(err).message);
      setPendingTier(null);
    }
  }

  async function confirmCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      await billingApi.cancel();
      const fresh = await billingApi.getSubscription();
      setSub(fresh);
      setCancelOpen(false);
    } catch (err) {
      setActionError(classifyError(err).message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="mx-auto max-w-6xl px-6 py-20 text-[14px] text-ink-muted">
          Loading…
        </div>
      </div>
    );
  }

  // Tenants/agents end up here if they somehow logged in — show a polite block.
  if (sub && !sub.applicable) {
    return (
      <div className="min-h-screen bg-paper text-foundation-700">
        <Nav />
        <PageHero
          eyebrow="Billing"
          title="Subscriptions are for landlords."
          subtitle={`You're signed in as a ${sub.role}. Tenants and agents don't have subscriptions on Property360.`}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Back to home →
          </Link>
        </PageHero>
        <Footer />
      </div>
    );
  }

  if (!sub || loadError) {
    return (
      <LoadErrorScreen
        error={loadError}
        apiUrl={API_BASE_URL}
        onRetry={() => void load()}
        onSignOut={signOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <p className="eyebrow">Billing</p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Your plan
        </h1>
        <p className="mt-3 text-[15px] text-ink-muted">
          Manage your Property360 subscription. Payments are processed by Paystack.
        </p>
        {actionError && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {actionError}
          </p>
        )}
      </section>

      <CurrentPlanCard sub={sub} onCancelClick={() => setCancelOpen(true)} />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[clamp(1.5rem,3.5vw,2rem)] font-extrabold tracking-[-0.02em]">
              Choose a plan
            </h2>
            <p className="mt-2 text-[14px] text-ink-muted">
              Pick the tier that fits your portfolio. You can upgrade or downgrade any time.
            </p>
          </div>
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <PlanCard
              key={tier.name}
              tier={tier}
              interval={interval}
              currentTier={sub.tier}
              currentInterval={sub.billingInterval}
              pending={pendingTier === tier.name.toLowerCase()}
              disabled={pendingTier !== null}
              onSelect={
                tier.monthlyNgn != null
                  ? () => startCheckout(tier.name.toLowerCase() as CheckoutTier)
                  : undefined
              }
            />
          ))}
        </div>

        <p className="mt-8 text-center text-[12.5px] text-ink-muted">
          Paystack will redirect you to a secure checkout. Your card, bank transfer
          or USSD details never leave Paystack.
        </p>
      </section>

      {cancelOpen && (
        <CancelDialog
          onClose={() => setCancelOpen(false)}
          onConfirm={confirmCancel}
          cancelling={cancelling}
          renewsAt={sub.renewsAt}
        />
      )}

      <Footer />
    </div>
  );
}

function LoadErrorScreen({
  error,
  apiUrl,
  onRetry,
  onSignOut,
}: {
  error: LoadError | null;
  apiUrl: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const title =
    error?.kind === "not-found"
      ? "Subscription service not available"
      : error?.kind === "network"
      ? "Can't reach the API"
      : "Couldn't load your subscription";
  const body =
    error?.message ??
    "Something went wrong loading your subscription. Try again, or sign in again if you suspect your session has lapsed.";

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <section className="mx-auto max-w-xl px-6 pt-16 pb-24">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-[15.5px] font-semibold text-amber-900">{title}</p>
              <p className="mt-1 text-[13.5px] leading-[1.55] text-amber-900/80">{body}</p>
              <p className="mt-3 text-[12.5px] text-amber-900/70">
                API: <code className="rounded bg-amber-100 px-1.5 py-0.5">{apiUrl}</code>
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="rounded-full bg-foundation-700 px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              Try again
            </button>
            <button
              onClick={onSignOut}
              className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Sign out
            </button>
          </div>
          {error?.kind === "not-found" && (
            <p className="mt-5 text-[12.5px] leading-[1.5] text-amber-900/70">
              Tip: if you&apos;re running locally, point the web app at your local API
              by creating <code className="rounded bg-amber-100 px-1.5 py-0.5">web/.env.local</code>{" "}
              with{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5">
                NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
              </code>
              {" "}— then restart <code className="rounded bg-amber-100 px-1.5 py-0.5">npm run dev</code>.
            </p>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function CurrentPlanCard({
  sub,
  onCancelClick,
}: {
  sub: SubscriptionView;
  onCancelClick: () => void;
}) {
  const statusLabel: Record<string, { label: string; tone: string }> = {
    trialing: { label: "Free trial", tone: "bg-cryola-300 text-foundation-700" },
    active: { label: "Active", tone: "bg-foundation-700 text-cryola-300" },
    past_due: { label: "Past due", tone: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", tone: "bg-foundation-700/10 text-foundation-700" },
    expired: { label: "Expired", tone: "bg-red-100 text-red-700" },
  };
  const s = statusLabel[sub.status] ?? statusLabel.expired;

  const nextDateLine =
    sub.status === "trialing" && sub.trialEndsAt
      ? `Trial ends ${formatDate(sub.trialEndsAt)}`
      : sub.status === "active" && sub.renewsAt
      ? `Renews ${formatDate(sub.renewsAt)}`
      : sub.status === "cancelled" && sub.renewsAt
      ? `Access ends ${formatDate(sub.renewsAt)}`
      : null;

  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="rounded-2xl border border-foundation-700/10 bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Current plan</p>
            <p className="mt-1 font-display text-[28px] font-extrabold tracking-[-0.02em]">
              {sub.tierDisplayName}
              {sub.tier !== "trial" && sub.tier !== "custom" && (
                <span className="ml-2 text-[14px] font-medium text-ink-muted">
                  · {sub.billingInterval === "annual" ? "Annual" : "Monthly"}
                </span>
              )}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${s.tone}`}
              >
                {s.label}
              </span>
              {nextDateLine && (
                <span className="text-[13px] text-ink-muted">{nextDateLine}</span>
              )}
            </div>
          </div>
          {sub.status === "active" && (
            <button
              onClick={onCancelClick}
              className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel subscription
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UsageMeter
            label="Properties"
            used={sub.usage.propertyCount}
            limit={sub.usage.propertyLimit}
          />
          <UsageMeter
            label="Agent seats"
            used={sub.usage.agentSeatCount}
            limit={sub.usage.agentSeatLimit}
          />
        </div>
      </div>
    </section>
  );
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(1, used / Math.max(limit, 1));
  const atLimit = !unlimited && used >= limit;
  return (
    <div className="rounded-2xl border border-foundation-700/10 bg-paper-deep/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {label}
        </p>
        <p
          className={`tabular text-[14px] font-semibold ${
            atLimit ? "text-red-600" : "text-foundation-700"
          }`}
        >
          {used} {unlimited ? "· unlimited" : `of ${limit}`}
        </p>
      </div>
      {!unlimited && (
        <div className="mt-3 h-1.5 rounded-full bg-foundation-700/10">
          <div
            className={`h-full rounded-full ${
              atLimit ? "bg-red-500" : "bg-foundation-700"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

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
  const isCurrent =
    tier.name.toLowerCase() === currentTier && interval === currentInterval;
  const isHighlight = !!tier.highlight;
  const price = interval === "annual" ? tier.annualNgn : tier.monthlyNgn;
  const unit = interval === "annual" ? "/year" : "/month";
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
      <p
        className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${
          isHighlight ? "text-cryola-300" : "text-foundation-700"
        }`}
      >
        {tier.name}
      </p>
      <p
        className={`mt-2 text-[13.5px] leading-snug ${
          isHighlight ? "text-paper/80" : "text-ink-muted"
        }`}
      >
        {tier.tagline}
      </p>
      <div className="mt-5">
        {price != null ? (
          <>
            <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.02em]">
              ₦{price.toLocaleString("en-NG")}
              <span
                className={`ml-1 text-[13px] font-medium ${
                  isHighlight ? "text-paper/70" : "text-ink-muted"
                }`}
              >
                {unit}
              </span>
            </p>
            {interval === "annual" && tier.annualNgn != null && (
              <p
                className={`mt-1 text-[11.5px] ${
                  isHighlight ? "text-paper/80" : "text-ink-muted"
                }`}
              >
                ~₦{Math.round(tier.annualNgn / 12).toLocaleString("en-NG")}/month · save 20%
              </p>
            )}
          </>
        ) : (
          <p className="font-display text-[24px] font-extrabold leading-none">
            Talk to us
          </p>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                isHighlight ? "text-cryola-300" : "text-foundation-700"
              }`}
              strokeWidth={2.5}
            />
            <span className={isHighlight ? "text-paper/90" : "text-ink-muted"}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      {tier.monthlyNgn == null ? (
        <Link
          href="/contact"
          className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold transition ${
            isHighlight
              ? "bg-cryola-300 text-foundation-700 hover:bg-cryola-400"
              : "bg-foundation-700 text-paper hover:bg-foundation-800"
          }`}
        >
          Contact sales <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : isCurrent ? (
        <span
          className={`mt-7 inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-[13px] font-semibold ${
            isHighlight
              ? "border-cryola-300 text-cryola-300"
              : "border-foundation-700/20 text-foundation-700"
          }`}
        >
          Current plan
        </span>
      ) : (
        <button
          onClick={onSelect}
          disabled={disabled}
          className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold transition disabled:opacity-50 ${
            isHighlight
              ? "bg-cryola-300 text-foundation-700 hover:bg-cryola-400"
              : "bg-foundation-700 text-paper hover:bg-foundation-800"
          }`}
        >
          {pending ? "Redirecting to Paystack…" : `Choose ${tier.name}`}
        </button>
      )}
    </div>
  );
}

function CancelDialog({
  onClose,
  onConfirm,
  cancelling,
  renewsAt,
}: {
  onClose: () => void;
  onConfirm: () => void;
  cancelling: boolean;
  renewsAt?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foundation-900/60 px-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-foundation-700/10 bg-surface p-6">
        <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-foundation-700">
          Cancel subscription?
        </h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-muted">
          Your subscription will stop renewing.{" "}
          {renewsAt
            ? `You keep access until ${formatDate(renewsAt)}, after which property creation, agent invitations, and listings will be blocked until you resubscribe.`
            : "Property creation, agent invitations, and listings will be blocked once your access ends."}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-60"
          >
            Keep my plan
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="rounded-full bg-red-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
