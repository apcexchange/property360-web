import { Metadata } from "next";
import Link from "next/link";
import { Wallet, Receipt, Wrench, MessageSquare, Users, FileSignature } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { PricingTableWithToggle } from "@/components/marketing/PricingTableWithToggle";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";

export const metadata: Metadata = {
  title: "For landlords, collect rent on time, manage every unit",
  description:
    "Property360 helps Nigerian landlords lease units, collect rent through Paystack, generate tenancy agreements, and manage maintenance, all from one app.",
  alternates: { canonical: "/landlord" },
  openGraph: {
    title: "Property360 for landlords, collect rent on time",
    description:
      "Lease units, collect rent through Paystack, manage maintenance, all from one app.",
    url: "https://property360.africa/landlord",
    type: "website",
  },
};

const BENEFITS = [
  {
    icon: Wallet,
    title: "Rent that arrives, not chases.",
    body:
      "Tenants pay through Paystack, card, bank transfer, or USSD. Your wallet credits instantly and pays out to your bank account on demand.",
  },
  {
    icon: Receipt,
    title: "Receipts and invoices, automated.",
    body:
      "Recurring rent invoices generate on the schedule you choose. Receipts are issued the moment a tenant pays, no chasing, no paperwork.",
  },
  {
    icon: FileSignature,
    title: "Tenancy agreements signed in-app.",
    body:
      "Upload your template once. Tenants sign electronically in-app, typed name plus optional signature image, with timestamp, IP, and document hash captured as evidence. Stored against the lease and downloadable as PDF.",
  },
  {
    icon: Wrench,
    title: "Maintenance triaged, not lost.",
    body:
      "Tenants report issues with photos and priority. You assign, track, and close, with a paper trail for every unit.",
  },
  {
    icon: Users,
    title: "Agents who work for you, not around you.",
    body:
      "Give an agent access to specific permissions per property, add tenants, record payments, manage maintenance. Revoke any time.",
  },
  {
    icon: MessageSquare,
    title: "All your tenant chats in one place.",
    body:
      "Built-in real-time chat replaces the WhatsApp soup. Searchable, attributable, tied to the unit.",
  },
];

export default function LandlordPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="For landlords"
        title={
          <>
            Run the property.
            <br />
            <span className="text-cryola-500">Not the chaos around it.</span>
          </>
        }
        subtitle="Collect rent, keep tenancies moving, fill vacancies and stay on top of every property—from one flat to a growing portfolio. Built for the way Nigeria rents."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Manage a property free →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            See plans →
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="eyebrow">Your operating desk</p>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foundation-700">The work that makes a portfolio feel under control.</h2>
          </div>
          <p className="max-w-xl text-[15px] leading-[1.65] text-ink-muted">Everything sits with the property it belongs to, so you can see what has happened, what is due next and who owns the next action.</p>
        </div>
        <div className="mt-12 grid border-y border-foundation-700/15 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, index) => {
            const Icon = b.icon;
            return (
              <article
                key={b.title}
                className="group border-b border-foundation-700/15 py-7 md:px-7 md:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:nth-child(3n+1)]:px-0 lg:[&:nth-child(3n+2)]:border-r lg:[&:nth-child(3n+2)]:px-7 lg:[&:nth-child(3n+3)]:px-7 lg:[&:nth-child(3n+3)]:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-cryola-600">0{index + 1}</span>
                  <Icon className="h-5 w-5 text-foundation-700 transition-colors group-hover:text-cryola-600" strokeWidth={1.8} />
                </div>
                <h3 className="mt-8 text-[16px] font-semibold tracking-[-0.015em] text-foundation-700">
                  {b.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink-muted">{b.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
            Pay for the size of your portfolio.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-muted">
            Start free with the trial. Upgrade when you outgrow it. No setup fees,
            no per-tenant charges.
          </p>
          <div className="mt-10">
            <PricingTableWithToggle />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Built in Nigeria, for landlords nationwide.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
          Create your free account and bring your first property over in under
          ten minutes.
        </p>
        <div className="mt-8">
          <AppStoreButtons align="center" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
