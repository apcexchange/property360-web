import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { AdSenseScript } from "@/components/marketing/AdSenseScript";
import { GuideChecklist } from "@/components/marketing/GuideChecklist";
import { GuideIllustration } from "@/components/marketing/GuideIllustration";
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
  const socialImage = `/guides/${slug}/opengraph-image`;
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
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
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
  const socialImage = `${url}/opengraph-image`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.heading,
    description: meta.description,
    datePublished: meta.datePublished,
    dateModified: meta.dateModified ?? meta.datePublished,
    inLanguage: "en-NG",
    image: socialImage,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Organization",
      name: meta.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Property360",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    keywords: meta.keywords.join(", "),
    articleSection: meta.category,
    ...(meta.faqs?.length
      ? {
          mainEntity: meta.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : {}),
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
          By <span className="font-semibold text-foundation-700">{meta.author}</span>
          <span aria-hidden="true"> · </span>
          Published {formatDate(meta.datePublished)}
          <span aria-hidden="true"> · </span>
          {meta.readingMinutes} min read
        </p>

        <figure className="mt-8 overflow-hidden rounded-2xl border border-foundation-700/10 bg-foundation-700">
          <Image
            src={`/guides/${slug}/opengraph-image`}
            alt=""
            width={1200}
            height={630}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="block aspect-[1.91/1] w-full object-cover"
          />
          <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] text-paper/65">
            Property360 Guides · Practical context for Nigerian renters and property owners.
          </figcaption>
        </figure>

        {meta.standfirst && (
          <p className="mt-8 border-l-2 border-cryola-400 pl-5 text-[19px] leading-relaxed text-foundation-700 md:text-[21px]">
            {meta.standfirst}
          </p>
        )}

        <GuideIllustration
          slug={slug}
          variant={1}
          alt={`A checklist for ${meta.heading.toLowerCase()}`}
          caption="Use this checklist to prepare your next conversation, inspection or payment record."
        />

        <div className="prose-legal mt-10">
          <Body />
        </div>

        {meta.takeaways && meta.takeaways.length > 0 && (
          <section className="mt-12 border-y border-foundation-700/10 py-8" aria-labelledby="guide-takeaways">
            <p className="eyebrow">Decision support</p>
            <h2 id="guide-takeaways" className="mt-2 font-display text-[25px] font-bold text-foundation-700">
              Before you decide
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {meta.takeaways.map((takeaway) => (
                <div key={takeaway.title} className="rounded-xl bg-paper-deep/50 p-5">
                  <h3 className="text-[15px] font-bold text-foundation-700">{takeaway.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{takeaway.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <GuideIllustration
          slug={slug}
          variant={2}
          alt={`A practical checklist for ${meta.heading.toLowerCase()}`}
          caption="A practical reminder drawn from this guide. Confirm legal, financial and property-specific decisions against your signed agreement and the rules that apply where the property is located."
        />

        <GuideChecklist
          title="Use this checklist"
          items={meta.checklist}
        />

        {meta.faqs && meta.faqs.length > 0 && (
          <section className="mt-12" aria-labelledby="guide-faqs">
            <p className="eyebrow">Common questions</p>
            <h2 id="guide-faqs" className="mt-2 font-display text-[25px] font-bold text-foundation-700">
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-foundation-700/10 border-y border-foundation-700/10">
              {meta.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 text-[16px] font-bold text-foundation-700 marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <GuideIllustration
          slug={slug}
          variant={3}
          alt={`Questions to consider about ${meta.heading.toLowerCase()}`}
          caption="Use these questions to identify what still needs confirmation before you commit, pay or take formal action."
        />

        {meta.sources && meta.sources.length > 0 && (
          <section className="mt-10 rounded-2xl border border-foundation-700/10 bg-white p-6">
            <h2 className="text-[16px] font-bold text-foundation-700">
              Sources and further reading
            </h2>
            <ul className="mt-3 space-y-2">
              {meta.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-medium text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                  >
                    {source.publisher ? `${source.publisher}: ${source.label}` : source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 text-[12px] leading-relaxed text-ink-muted">
          Found something outdated or unclear?{" "}
          <Link
            href={`/contact?subject=${encodeURIComponent(`Guide correction: ${meta.heading}`)}`}
            className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Send an editorial correction
          </Link>
          .
        </p>

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

      <AdSenseScript />

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
