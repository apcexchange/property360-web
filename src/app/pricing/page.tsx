import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { TIERS } from "@/components/marketing/PricingTable";
import { PricingTableWithToggle } from "@/components/marketing/PricingTableWithToggle";

export const metadata: Metadata = {
  title: "Pricing — Property360 for Nigerian landlords",
  description:
    "Property360 tier pricing for Nigerian landlords. Pay monthly based on the size of your portfolio. 14-day free trial, no setup fees.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Property360 pricing",
    description:
      "Tier pricing scaled by portfolio size. 14-day free trial, no setup fees.",
    url: "https://property360.africa/pricing",
    type: "website",
  },
};

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — the Solo tier comes with a 14-day free trial. No card required to start.",
  },
  {
    q: "What counts as a property?",
    a: "A property is a building (a flat, a house, a block of units). Units inside a property — for example individual flats in a block — don't count separately against your property cap.",
  },
  {
    q: "Are payment processing fees included?",
    a: "No — Paystack's standard processing fees (1.5% + ₦100 capped at ₦2,000) are charged on each transaction and deducted before settlement. Property360 doesn't take a cut.",
  },
  {
    q: "Can I switch tiers mid-month?",
    a: "Yes. Upgrades take effect immediately and you're billed the prorated difference. Downgrades take effect at your next renewal.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — paying annually saves 20% vs. monthly. Pick your interval at /billing or during onboarding.",
  },
  {
    q: "How does agent seat counting work?",
    a: "An agent seat is one person you've invited to manage one or more of your properties. The same agent across multiple properties only counts as one seat.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            One price, the size of your portfolio.
            <br />
            <span className="text-cryola-500">No per-tenant fees, ever.</span>
          </>
        }
        subtitle="Pay only for the number of properties you manage. Tenants and agents you invite are included."
      >
        <p className="text-[13px] text-ink-muted">
          Save <span className="font-semibold text-foundation-700">20% when paid annually</span>.
        </p>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <PricingTableWithToggle />
        <p className="mt-6 text-center text-[12.5px] text-ink-muted">
          All prices in Nigerian Naira (₦). VAT included where applicable.
        </p>
      </section>

      <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="eyebrow">Compare</p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
            What&apos;s included in every tier.
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-2.5 text-[14.5px] text-ink-body sm:grid-cols-2">
            {[
              "Unlimited tenants",
              "Unlimited maintenance requests",
              "Real-time chat",
              "Tenancy agreement generation",
              "Recurring rent invoices",
              "Paystack rent collection",
              "Wallet + bank payouts",
              "Marketplace listings",
              "In-app notifications",
              "iOS + Android apps",
            ].map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 border-b border-foundation-700/5 py-2 last:border-b-0"
              >
                <span className="text-cryola-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Questions, answered.
        </h2>
        <dl className="mt-8 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-foundation-700/10 pb-6 last:border-b-0">
              <dt className="text-[15.5px] font-semibold text-foundation-700">{f.q}</dt>
              <dd className="mt-2 text-[14.5px] leading-[1.6] text-ink-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 text-center">
        <p className="text-[15px] text-ink-muted">
          Got a portfolio bigger than {TIERS[2].name}?{" "}
          <Link href="/contact" className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">
            Talk to sales →
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
