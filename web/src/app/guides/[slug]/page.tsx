import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { guides, getGuide, getRelatedGuides } from "@/content/guides";

const SITE_URL = "https://property360.africa";

type Params = { slug: string };

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };

  const { title, description } = guide.meta;
  return {
    title,
    description,
    keywords: guide.meta.keywords,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/guides/${slug}`,
      type: "article",
      publishedTime: guide.meta.datePublished,
      modifiedTime: guide.meta.dateModified ?? guide.meta.datePublished,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { meta, Body } = guide;
  const related = getRelatedGuides(slug);
  const url = `${SITE_URL}/guides/${slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.heading,
    description: meta.description,
    datePublished: meta.datePublished,
    dateModified: meta.dateModified ?? meta.datePublished,
    inLanguage: "en-NG",
    image: `${SITE_URL}/opengraph-image`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "Property360", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Property360",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${SITE_URL}/guides`,
      },
      { "@type": "ListItem", position: 3, name: meta.heading, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <article className="mx-auto max-w-3xl px-6 pt-14 pb-20 md:pt-20">
        <Link
          href="/guides"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted transition hover:text-foundation-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All guides
        </Link>

        <p className="mt-8 text-[12px] font-semibold uppercase tracking-wide text-cryola-500">
          {meta.category}
        </p>
        <h1 className="mt-2 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.02em] text-foundation-700">
          {meta.heading}
        </h1>
        <p className="mt-4 text-[14px] text-ink-muted">
          {formatDate(meta.datePublished)} · {meta.readingMinutes} min read
        </p>

        <div className="prose-legal mt-10">
          <Body />
        </div>

        <div className="mt-12 rounded-2xl border border-foundation-700/10 bg-white p-6">
          <h2 className="text-[20px] font-bold text-foundation-700">
            Run your rentals the easy way
          </h2>
          <p className="mt-2 text-[15px] leading-[1.55] text-ink-muted">
            Property360 helps Nigerian landlords manage properties, leases, and
            tenants, collect rent online, and get paid straight to their bank.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-foundation-700 px-5 py-2.5 text-[14px] font-semibold text-paper transition hover:bg-foundation-700/90"
          >
            Start free
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {related.length > 0 && (
          <div className="mt-14 border-t border-foundation-700/10 pt-10">
            <h2 className="text-[14px] font-semibold uppercase tracking-wide text-ink-muted">
              Keep reading
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((g) => (
                <Link
                  key={g.meta.slug}
                  href={`/guides/${g.meta.slug}`}
                  className="group rounded-xl border border-foundation-700/10 bg-white p-5 transition hover:border-cryola-400"
                >
                  <h3 className="text-[16px] font-bold leading-snug text-foundation-700">
                    {g.meta.heading}
                  </h3>
                  <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-foundation-700">
                    Read guide
                    <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
