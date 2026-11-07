import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";

export const metadata: Metadata = {
  title: "Editorial Policy and Corrections",
  description:
    "How Property360 prepares, attributes, sources, updates, and corrects its practical guides for Nigerian landlords, tenants, and agents.",
  alternates: { canonical: "/editorial-policy" },
  openGraph: {
    title: "Property360 Editorial Policy",
    description:
      "Our standards for practical guides, sourcing, legal information, and corrections.",
    url: "https://property360.africa/editorial-policy",
    type: "website",
  },
};

export default function EditorialPolicyPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="How we work"
        title={
          <>
            Useful guidance.
            <br />
            <span className="text-cryola-500">Clear about its limits.</span>
          </>
        }
        subtitle="Our guides are practical information for people navigating property in Nigeria. Here is how we identify the author, handle sources, and correct mistakes."
      />
      <main className="mx-auto max-w-3xl px-6 pb-20">
        <div className="prose-legal">
          <h2>Authorship</h2>
          <p>
            Guides attributed to the Property360 Editorial Team are published
            under that team name. We do not present an article as written or
            reviewed by a lawyer, accountant, or other specialist unless that
            person is specifically identified on the article.
          </p>

          <h2>Sources and factual claims</h2>
          <p>
            We aim to link to primary or authoritative sources for material
            factual claims. Product instructions should reflect the current
            product. Where a claim cannot be verified or depends on location,
            agreement, or individual circumstances, the guide should say so
            rather than present a general rule as universal.
          </p>
          <p>
            Prices, charges, and market conditions change. Our tools use figures
            supplied by the visitor and do not estimate market prices or decide
            whether a fee is lawful.
          </p>

          <h2>Legal and financial information</h2>
          <p>
            Property and tenancy rules can vary between Nigerian states and
            change over time. Our guides are general information, not legal,
            financial, tax, or professional advice. We do not imply specialist
            review where no specialist reviewer is named. For a decision or
            dispute, consult a qualified professional familiar with the relevant
            state and facts.
          </p>

          <h2>Updates and corrections</h2>
          <p>
            Article pages show their publication date. We display an updated date
            when the article has been substantively revised; changing a page
            layout alone is not a reason to reset it. If you spot a factual error
            or outdated detail, please tell us what should be checked and include
            a supporting source where possible.
          </p>
          <p>
            Send corrections through our{" "}
            <Link href="/contact">contact page</Link> and mention the guide title.
            We review submitted corrections and update or clarify content when
            warranted.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
