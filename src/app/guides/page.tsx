import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { NewsletterBlock } from "@/components/marketing/NewsletterBlock";
import { GuidesSearch } from "@/components/marketing/GuidesSearch";
import { guides } from "@/content/guides";

const SITE_URL = "https://property360.africa";

export const metadata: Metadata = {
  title: "Property guides for Nigerian landlords, tenants & agents",
  description:
    "Practical guides on renting in Nigeria: tenancy agreements, caution fees, collecting rent online, eviction and quit notices, rent increases, and more.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Property360 Guides, renting in Nigeria, explained",
    description:
      "Practical, plain-English guides for Nigerian landlords, tenants, and agents.",
    url: `${SITE_URL}/guides`,
    type: "website",
  },
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: guides.map((g, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/guides/${g.meta.slug}`,
    name: g.meta.heading,
  })),
};

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Renting in Nigeria,
            <br />
            <span className="text-cryola-500">explained simply.</span>
          </>
        }
        subtitle="Practical, locally focused explainers for Nigerian landlords, tenants, and agents—plus tools to help you act on what you learn."
      />

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-10 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <Link
            href="/guides/tools/move-in-cost-calculator"
            className="group rounded-2xl bg-foundation-700 p-6 text-paper transition hover:bg-foundation-800 md:p-8"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
              Free rental tool
            </p>
            <h2 className="mt-3 font-display text-[25px] font-bold leading-tight md:text-[30px]">
              Calculate your move-in costs
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-paper/75">
              Add the rent and fees you have actually been quoted. See the total
              clearly—without relying on a generic estimate.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-cryola-300">
              Open the calculator <span aria-hidden="true">→</span>
            </span>
          </Link>
          <div className="rounded-2xl border border-foundation-700/10 bg-white p-6 md:p-8">
            <p className="eyebrow">Editorial standards</p>
            <h2 className="mt-3 font-display text-[22px] font-bold text-foundation-700">
              Know who made this guide
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              Learn how we write, update, and correct our practical resources.
            </p>
            <Link
              href="/editorial-policy"
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
            >
              Read our editorial policy
            </Link>
          </div>
        </div>

        <GuidesSearch
          guides={guides.map(({ meta }) => ({
            slug: meta.slug,
            heading: meta.heading,
            description: meta.description,
            standfirst: meta.standfirst,
            category: meta.category,
            readingMinutes: meta.readingMinutes,
          }))}
        />
      </section>

      <NewsletterBlock source="newsletter-guides" heading="Get the next guide by email" />

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    </div>
  );
}
