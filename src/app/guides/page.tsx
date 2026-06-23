import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { guides } from "@/content/guides";

const SITE_URL = "https://property360.africa";

export const metadata: Metadata = {
  title: "Property guides for Nigerian landlords, tenants & agents",
  description:
    "Practical guides on renting in Nigeria: tenancy agreements, caution fees, collecting rent online, eviction and quit notices, rent increases, and more.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Property360 Guides — renting in Nigeria, explained",
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
        eyebrow="Guides"
        title={
          <>
            Renting in Nigeria,
            <br />
            <span className="text-cryola-500">explained simply.</span>
          </>
        }
        subtitle="Plain-English guides on tenancy agreements, fees, collecting rent, eviction, and everything else that comes with renting property in Nigeria."
      />

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.meta.slug}
              href={`/guides/${g.meta.slug}`}
              className="group flex flex-col rounded-2xl border border-foundation-700/10 bg-white p-6 transition hover:border-cryola-400 hover:shadow-sm"
            >
              <span className="text-[12px] font-semibold uppercase tracking-wide text-cryola-500">
                {g.meta.category}
              </span>
              <h2 className="mt-2 text-[20px] font-bold leading-snug text-foundation-700">
                {g.meta.heading}
              </h2>
              <p className="mt-2 flex-1 text-[15px] leading-[1.5] text-ink-muted">
                {g.meta.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-foundation-700">
                Read guide
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <span className="ml-2 font-normal text-ink-muted">
                  {g.meta.readingMinutes} min read
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    </div>
  );
}
