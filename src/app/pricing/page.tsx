import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { TIERS } from "@/components/marketing/pricingTiers";
import { PricingTableWithToggle } from "@/components/marketing/PricingTableWithToggle";
import { Founding50 } from "@/components/marketing/Founding50";
import { FoundingBar } from "@/components/marketing/FoundingBar";

export const metadata: Metadata = {
  title: "Pricing, Property360 for Nigerian landlords",
  description:
    "Start free with a 7-day trial, no card required. Pay only when your portfolio grows. Tier pricing based on number of properties; tenants and managers are always included.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Property360 pricing",
    description:
      "Start free with a 7-day trial. No card required. Tier pricing scaled by portfolio size.",
    url: "https://property360.africa/pricing",
    type: "website",
  },
};

const FAQS = [
  {
    q: "I own a hostel with 30 rooms. Does that count as 30 properties?",
    a: "No. A property is a whole building. A 30-room hostel counts as one property, and you can collect rent from all 30 rooms (and chat with all 30 tenants) on the Solo tier. The same is true of a block of 12 flats, that's one property, twelve units inside it.",
  },
  {
    q: "What counts as a property?",
    a: "A property is a building, a flat, a house, a block of flats, a hostel, a shop. The flats / rooms / units inside that building don't count separately against your property cap. If you own two separate buildings, that's two properties even if each has only one unit.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every new account starts on a 7-day free trial with up to 2 properties, no card required. After the trial you pick a tier and start paying.",
  },
  {
    q: "Are payment processing fees included?",
    a: "No, Paystack's standard processing fees (1.5% + ₦100 capped at ₦2,000) are charged on each transaction and deducted before settlement. Property360 doesn't take a cut of your rent.",
  },
  {
    q: "How does property manager seat counting work?",
    a: "A seat is one person you've invited to help manage your properties. The same property manager working across multiple of your properties only counts as one seat.",
  },
  {
    q: "Can I switch tiers mid-month?",
    a: "Yes. Upgrades take effect immediately and you're billed the prorated difference. Downgrades take effect at your next renewal.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes, paying annually saves 20% vs. monthly. Pick your interval at /billing or during onboarding.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <FoundingBar />
      <Nav />
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Start free.
            <br />
            <span className="text-cryola-500">Pay only when you grow.</span>
          </>
        }
        subtitle="7-day free trial on every new account, no card required. Then pay only for the number of properties you manage. Tenants and property managers are always included, no per-seat fees."
      >
        <p className="text-[13px] text-ink-muted">
          Save <span className="font-semibold text-foundation-700">20% when paid annually</span>.
        </p>
      </PageHero>

      <Founding50 />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10 rounded-2xl border border-foundation-700/10 bg-cryola-50/60 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-foundation-700 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cryola-300">
              Hostels &amp; multi-unit
            </span>
            <p className="text-[14.5px] leading-[1.55] text-foundation-700">
              <span className="font-semibold">A property = a whole building.</span>{" "}
              The flats, rooms, or hostel beds inside that building are{" "}
              <span className="font-semibold">unlimited</span>. A 40-room hostel
              counts as one property, same as a single 2-bedroom flat.
            </p>
          </div>
        </div>
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
              "Manual tenancy agreement templates",
              "Recurring rent invoices",
              "Paystack rent collection",
              "Wallet + bank payouts",
              "Quit notice + receipt templates",
              "Marketplace listings",
              "In-app notifications",
              "iOS + Android apps (coming)",
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

      <section className="border-t border-foundation-700/10 bg-foundation-700 py-20 text-paper">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cryola-300">
            For reference
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-paper">
            What ₦2,250 a month replaces.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="font-display text-[28px] font-extrabold text-cryola-300">
                ~₦30,000+
              </p>
              <p className="mt-2 text-[14px] leading-[1.5] text-paper/75">
                A part-time property manager in Nigeria, monthly.
              </p>
            </div>
            <div>
              <p className="font-display text-[28px] font-extrabold text-cryola-300">
                Hours per week
              </p>
              <p className="mt-2 text-[14px] leading-[1.5] text-paper/75">
                Spent chasing rent, writing receipts, and digging up
                agreements out of email and phone galleries.
              </p>
            </div>
            <div>
              <p className="font-display text-[28px] font-extrabold text-cryola-300">
                Zero
              </p>
              <p className="mt-2 text-[14px] leading-[1.5] text-paper/75">
                Spreadsheets you need to maintain. Notebooks that go missing.
                Receipts you have to print.
              </p>
            </div>
          </div>
          <p className="mt-10 text-[14px] text-paper/65">
            Solo is ₦2,250/month, less than the cost of a single tank of fuel
            in most Nigerian cities, and it manages your entire building.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
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
