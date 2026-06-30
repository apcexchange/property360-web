// Pricing tier catalogue. Kept in its own (non-"use client") module so
// server components (e.g. /pricing/page.tsx) can import it directly, // importing a plain data constant from a "use client" file turns it
// into a client reference and crashes during SSR prerender.
//
// Keep this in sync with backend SubscriptionService.TIER_CONFIG.

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
    trial: "Start with 7 days FREE · no card required",
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
    tagline:
      "For growing landlords with multiple buildings or small agencies.",
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
