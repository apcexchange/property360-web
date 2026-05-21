"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { useOnboardingState } from "@/lib/onboarding-state";
import { TIERS, Tier } from "@/components/marketing/PricingTable";
import { IntervalToggle } from "@/components/marketing/IntervalToggle";
import { billingApi, BillingInterval } from "@/lib/billing-api";
import { API_BASE_URL } from "@/lib/api";
import { AxiosError } from "axios";

type CheckoutTier = "solo" | "pro" | "agency";

export default function PlanPage() {
  const router = useRouter();
  const { state, ready } = useOnboardingState();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [pending, setPending] = useState<CheckoutTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (state.role !== "landlord" || !state.registered) {
      router.replace("/onboarding/role");
    }
  }, [ready, state, router]);

  async function pick(tier: CheckoutTier) {
    setPending(tier);
    setError(null);
    try {
      const { authorizationUrl } = await billingApi.createCheckout(tier, interval);
      window.location.href = authorizationUrl;
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      const status = axErr.response?.status;
      const body =
        axErr.response?.data?.message ??
        (err instanceof Error ? err.message : "Could not start checkout.");
      // Append the URL the request actually hit so we can diagnose
      // misconfigured NEXT_PUBLIC_API_URL at a glance.
      setError(
        `${body}${status ? ` (HTTP ${status})` : ""} — API: ${API_BASE_URL}`
      );
      setPending(null);
    }
  }

  function continueWithTrial() {
    router.push("/onboarding/done");
  }

  return (
    <OnboardingShell currentStep="plan" includesPlan>
      <p className="eyebrow">Step 4</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Pick a plan.
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        Your 14-day free trial is already active. You can add up to 2 properties
        and invite 2 agents while you decide. Pick a plan now or do it later from
        your billing portal.
      </p>

      <div className="mt-6 rounded-2xl border border-cryola-300/40 bg-cryola-50 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-foundation-700" />
          <div>
            <p className="text-[14.5px] font-semibold text-foundation-700">
              You&apos;re on a 14-day free trial.
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Skip ahead to set up your first property if you&apos;re not ready to
              commit. We&apos;ll remind you before the trial ends.
            </p>
            <button
              type="button"
              onClick={continueWithTrial}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Continue with trial →
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <IntervalToggle value={interval} onChange={setInterval} />
      </div>

      <div className="mt-6 space-y-4">
        {TIERS.filter((t) => t.monthlyNgn != null).map((tier) => (
          <PlanRow
            key={tier.name}
            tier={tier}
            interval={interval}
            pending={pending === tier.name.toLowerCase()}
            disabled={pending !== null}
            onSelect={() => pick(tier.name.toLowerCase() as CheckoutTier)}
          />
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          {error}
        </p>
      )}

      <p className="mt-8 text-[12.5px] text-ink-muted">
        Got a portfolio bigger than Agency?{" "}
        <Link
          href="/contact"
          className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
        >
          Talk to sales
        </Link>
        .
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/onboarding/verify"
          className="text-[13px] font-semibold text-ink-muted transition hover:text-foundation-700"
        >
          ← Back
        </Link>
      </div>
    </OnboardingShell>
  );
}

function PlanRow({
  tier,
  interval,
  pending,
  disabled,
  onSelect,
}: {
  tier: Tier;
  interval: BillingInterval;
  pending: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isHighlight = !!tier.highlight;
  const price = interval === "annual" ? tier.annualNgn : tier.monthlyNgn;
  const unit = interval === "annual" ? "/year" : "/month";
  return (
    <div
      className={`flex flex-col items-start gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:justify-between ${
        isHighlight
          ? "border-foundation-700 bg-foundation-700 text-paper"
          : "border-foundation-700/10 bg-surface text-foundation-700"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={`text-[14px] font-semibold uppercase tracking-[0.16em] ${
              isHighlight ? "text-cryola-300" : "text-foundation-700"
            }`}
          >
            {tier.name}
          </p>
          {isHighlight && (
            <span className="rounded-full bg-cryola-300 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-foundation-700">
              Most popular
            </span>
          )}
        </div>
        <p className="mt-2 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em]">
          ₦{(price ?? 0).toLocaleString("en-NG")}
          <span
            className={`ml-1 text-[12px] font-medium ${
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
        <ul
          className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] ${
            isHighlight ? "text-paper/80" : "text-ink-muted"
          }`}
        >
          {tier.features.slice(0, 3).map((f) => (
            <li key={f} className="inline-flex items-center gap-1">
              <Check
                className={`h-3.5 w-3.5 ${
                  isHighlight ? "text-cryola-300" : "text-foundation-700"
                }`}
                strokeWidth={2.5}
              />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold transition disabled:opacity-50 ${
          isHighlight
            ? "bg-cryola-300 text-foundation-700 hover:bg-cryola-400"
            : "bg-foundation-700 text-paper hover:bg-foundation-800"
        }`}
      >
        {pending ? "Redirecting…" : `Choose ${tier.name}`}
      </button>
    </div>
  );
}
