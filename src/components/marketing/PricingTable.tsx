import Link from "next/link";
import { Check } from "lucide-react";
import { BillingInterval } from "@/lib/billing-api";

export type Tier = {
  name: string;
  tagline: string;
  monthlyNgn: number | null;
  annualNgn: number | null; // 20% saving vs monthly × 12; null for trial/custom
  monthlyLabel?: string;
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
  trial?: string;
  features: string[];
};

export const TIERS: Tier[] = [
  {
    name: "Solo",
    tagline: "For a landlord or hostel owner with up to 2 buildings.",
    monthlyNgn: 2250,
    annualNgn: 21600,
    trial: "Start with 14 days FREE · no card required",
    ctaLabel: "Start free trial",
    ctaHref: "/onboarding",
    features: [
      "Up to 2 properties (a 40-room hostel = 1 property)",
      "Unlimited tenants",
      "Manual tenancy agreement templates",
      "Rent collection via Paystack",
      "Maintenance requests",
      "Real-time chat with tenants",
      "Marketplace listings",
    ],
  },
  {
    name: "Pro",
    tagline: "For growing landlords with multiple buildings or small agencies.",
    monthlyNgn: 8500,
    annualNgn: 81600,
    highlight: true,
    ctaLabel: "Choose Pro",
    ctaHref: "/onboarding",
    features: [
      "Up to 30 properties (buildings)",
      "Everything in Solo",
      "AI-drafted tenancy agreements (Claude / Gemini)",
      "WhatsApp delivery for invoices, receipts & rent reminders",
      "Up to 5 property manager seats with role permissions",
      "Per-property financial reports",
      "Priority email support",
    ],
  },
  {
    name: "Agency",
    tagline: "For property managers operating across many landlords.",
    monthlyNgn: 22500,
    annualNgn: 216000,
    ctaLabel: "Choose Agency",
    ctaHref: "/onboarding",
    features: [
      "Up to 100 properties (buildings)",
      "Everything in Pro",
      "Unlimited property manager seats",
      "Bulk lease + invoice operations",
      "Dedicated onboarding session",
      "Phone + WhatsApp support",
    ],
  },
  {
    name: "Custom",
    tagline: "For enterprises and large portfolios.",
    monthlyNgn: null,
    annualNgn: null,
    monthlyLabel: "Talk to us",
    ctaLabel: "Contact sales",
    ctaHref: "/contact",
    features: [
      "Unlimited properties + seats",
      "Custom integrations",
      "Whitelabel options",
      "SLA-backed uptime",
      "Migration assistance",
    ],
  },
];

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
  const isHighlight = !!tier.highlight;
  const price =
    interval === "annual" ? tier.annualNgn : tier.monthlyNgn;
  const unit = interval === "annual" ? "/year" : "/month";
  // Effective monthly when paying annually — useful comparison anchor.
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
        href={tier.ctaHref}
        className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold transition ${
          isHighlight
            ? "bg-cryola-300 text-foundation-700 hover:bg-cryola-400"
            : "bg-foundation-700 text-paper hover:bg-foundation-800"
        }`}
      >
        {tier.ctaLabel}
      </Link>
    </div>
  );
}
