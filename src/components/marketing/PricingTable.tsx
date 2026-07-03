"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { BillingInterval } from "@/lib/billing-api";
import { session } from "@/lib/session";
import { TIERS, Tier } from "./pricingTiers";

// Re-export so existing imports `from "@/components/marketing/PricingTable"`
// keep working, the data lives in pricingTiers.ts now so server
// components can import it without crashing the prerender.
export { TIERS };
export type { Tier };

export function PricingTable({
  compact = false,
  interval = "monthly",
}: {
  compact?: boolean;
  interval?: BillingInterval;
}) {
  return (
    <div
      className={`grid gap-5 ${
        compact ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"
      }`}
    >
      {TIERS.map((tier) => (
        <TierCard key={tier.name} tier={tier} interval={interval} />
      ))}
    </div>
  );
}

function TierCard({ tier, interval }: { tier: Tier; interval: BillingInterval }) {
  // Logged-in landlords / agents should skip the marketing /onboarding
  // funnel and land straight in the in-app billing page with the picked
  // tier + interval prefilled. The tenant + anonymous case keeps the
  // original CTAs (contact, onboarding) untouched.
  const [mounted, setMounted] = useState(false);
  const [ctaHref, setCtaHref] = useState(tier.ctaHref);
  useEffect(() => {
    setMounted(true);
    const user = session.getUser();
    if (
      user &&
      (user.role === "landlord" || user.role === "agent") &&
      tier.monthlyNgn != null
    ) {
      const qs = new URLSearchParams({
        tier: tier.name.toLowerCase(),
        interval,
      });
      setCtaHref(`/app/billing?${qs}`);
    }
  }, [tier, interval]);

  const ctaLabel = (() => {
    if (!mounted) return tier.ctaLabel;
    const user = session.getUser();
    if (!user) return tier.ctaLabel;
    if (user.role !== "landlord" && user.role !== "agent") return tier.ctaLabel;
    if (tier.monthlyNgn == null) return tier.ctaLabel;
    return `Choose ${tier.name}`;
  })();

  const isHighlight = !!tier.highlight;
  const price =
    interval === "annual" ? tier.annualNgn : tier.monthlyNgn;
  const unit = interval === "annual" ? "/year" : "/month";
  // Effective monthly when paying annually, useful comparison anchor.
  const monthlyEquivalent =
    interval === "annual" && tier.annualNgn != null
      ? Math.round(tier.annualNgn / 12)
      : null;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        isHighlight
          ? "border-foundation-700 bg-foundation-700 text-paper shadow-pop"
          : "border-foundation-700/10 bg-surface text-foundation-700"
      }`}
    >
      {isHighlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-cryola-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foundation-700">
          Most popular
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
        className={`mt-2 text-[14px] leading-snug ${
          isHighlight ? "text-paper/80" : "text-ink-muted"
        }`}
      >
        {tier.tagline}
      </p>
      <div className="mt-5">
        {price != null ? (
          <>
            <p className="font-display text-[36px] font-extrabold leading-none tracking-[-0.02em]">
              ₦{price.toLocaleString("en-NG")}
              <span
                className={`ml-1 text-[14px] font-medium ${
                  isHighlight ? "text-paper/70" : "text-ink-muted"
                }`}
              >
                {unit}
              </span>
            </p>
            {monthlyEquivalent != null && (
              <p
                className={`mt-1 text-[12px] ${
                  isHighlight ? "text-paper/80" : "text-ink-muted"
                }`}
              >
                ~₦{monthlyEquivalent.toLocaleString("en-NG")}/month · save 20%
              </p>
            )}
          </>
        ) : (
          <p className="font-display text-[28px] font-extrabold leading-none">
            {tier.monthlyLabel ?? "Custom"}
          </p>
        )}
        {tier.trial && (
          <p
            className={`mt-1 text-[12px] ${
              isHighlight ? "text-cryola-300" : "text-foundation-700"
            }`}
          >
            {tier.trial}
          </p>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13.5px]">
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

      <Link
        href={ctaHref}
        className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold transition ${
          isHighlight
            ? "bg-cryola-300 text-foundation-700 hover:bg-cryola-400"
            : "bg-foundation-700 text-paper hover:bg-foundation-800"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
