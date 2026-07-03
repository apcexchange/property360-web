import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";

export const metadata: Metadata = {
  title: "About Property360",
  description:
    "Property360 is a Lagos-built property management platform for Nigerian landlords, tenants, and agents. Our story and mission.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Property360",
    description: "A Lagos-built property management platform for Nigeria.",
    url: "https://property360.africa/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="About"
        title={
          <>
            Built in Nigeria.
            <br />
            <span className="text-cryola-500">For the way Nigeria rents.</span>
          </>
        }
        subtitle="Property360 exists because renting in Nigeria runs on cash, WhatsApp, and trust that gets burned. We're building the software that should have been there all along."
      />

      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="prose-legal">
          <h2>What we do</h2>
          <p>
            Property360 is one product with three sides: an app for landlords to
            manage portfolios, an app for tenants to pay rent and live in their home,
            and an app for agents to work for landlords with proper access, all on the
            same backbone.
          </p>
          <p>
            We handle the small things landlords spend hours on: generating tenancy
            agreements, issuing receipts, sending rent reminders, recording
            payments, paying out to bank accounts, triaging maintenance, and keeping
            chat with tenants attributable. We don&apos;t try to replace estate management
            companies, we give them and the landlords they work with the same tool.
          </p>

          <h2>Why we built it</h2>
          <p>
            Renting in Nigeria has unique mechanics, annual rent paid up-front, a
            stack of fees that includes agreement and caution, agents who work on
            commission, and tenants who are often paying through informal channels.
            International software doesn&apos;t fit, and what local options exist are
            either landlord-only spreadsheets or marketing-only listing sites.
          </p>
          <p>
            Property360 was built end-to-end for this market: Paystack for payments,
            NGN-only currency, Nigerian fee categories baked into the lease model, and
            a marketplace where every listing is tied to a verified landlord.
          </p>

          <h2>Where we are</h2>
          <p>
            Headquartered in Lagos, with landlords and tenants using the app across
            the country. The team writes code, talks to landlords on WhatsApp, and
            ships releases every couple of weeks.
          </p>
        </div>

        <div className="mt-10 border-t border-foundation-700/10 pt-10">
          <p className="text-[14px] text-ink-muted">
            Want to get in touch?{" "}
            <Link
              href="/contact"
              className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
            >
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
