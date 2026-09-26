import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, CreditCard, FileSignature, Wrench } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { ListingCard } from "@/components/marketing/ListingCard";
import { getListings } from "@/lib/listings-api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Find a home in Nigeria, Property360 for tenants",
  description:
    "Browse verified rental homes across Nigeria, reserve through Paystack, sign your tenancy agreement and pay rent, all in one app.",
  alternates: { canonical: "/tenant" },
  openGraph: {
    title: "Property360 for tenants, find a home you can trust",
    description:
      "Browse verified rentals, reserve through Paystack, sign in-app. No more cash to strangers.",
    url: "https://property360.africa/tenant",
    type: "website",
  },
};

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Reviewed listings, clear signals.",
    body:
      "New listings are reviewed before they go live. Where a publisher has completed identity verification, you will see that clearly on the listing.",
  },
  {
    icon: CreditCard,
    title: "Pay through Paystack.",
    body:
      "Reserve a unit, pay your deposit, pay your monthly rent, all through card, bank transfer, or USSD. Every payment leaves a receipt.",
  },
  {
    icon: FileSignature,
    title: "Tenancy agreements in-app.",
    body:
      "Sign electronically in-app: type your name, tick the acknowledgement, optionally upload your signature. No printouts, no agent's office, no signature mismatch headaches.",
  },
  {
    icon: Wrench,
    title: "Report repairs that get fixed.",
    body:
      "Submit maintenance requests with photos and priority. The landlord sees them; you see the status, no more lost WhatsApp messages.",
  },
];

export default async function TenantPage() {
  const featured = await getListings({ limit: 4 }).catch(() => ({
    listings: [],
    meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
  }));

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="For tenants"
        title={
          <>
            Find a home.
            <br />
            <span className="text-cryola-500">Without the runaround.</span>
          </>
        }
        subtitle="Browse reviewed listings, see publisher trust signals, reserve in a few taps and keep payments and tenancy records together."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Browse homes →
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            Sign up →
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><p className="eyebrow">A clearer way to rent</p><h2 className="max-w-3xl font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foundation-700">Everything you need to feel informed before—and after—you move in.</h2></div>
        <div className="mt-12 grid border-y border-foundation-700/15 md:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r, index) => {
            const Icon = r.icon;
            return (
              <article
                key={r.title}
                className="group border-b border-foundation-700/15 py-7 md:px-7 md:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex items-center justify-between"><span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-cryola-600">0{index + 1}</span><Icon className="h-5 w-5 text-foundation-700 transition-colors group-hover:text-cryola-600" strokeWidth={1.8} /></div>
                <h3 className="mt-8 text-[15.5px] font-semibold text-foundation-700">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-muted">{r.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {featured.listings.length > 0 && (
        <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Just listed</p>
                <h2 className="mt-2 font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
                  Homes hitting the market.
                </h2>
              </div>
              <Link
                href="/listings"
                className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900"
              >
                See all →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.listings.slice(0, 4).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Your next home is in the app.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
          Browsing is free and doesn&apos;t need an account. Sign up when you&apos;re ready to reserve.
        </p>
        <div className="mt-8">
          <AppStoreButtons align="center" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
