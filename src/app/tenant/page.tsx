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
    title: "Verified landlords only.",
    body:
      "Every landlord on Property360 is identity-verified. No ghost agents, no scams, no surprise fees added on inspection day.",
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
        subtitle="Browse real listings tied to verified landlords. Reserve in two taps. Pay through Paystack. No cash, no caution, no surprise."
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

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Why renters trust us</p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="rounded-2xl border border-foundation-700/10 bg-surface p-6"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-foundation-700">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-muted">{r.body}</p>
              </div>
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
