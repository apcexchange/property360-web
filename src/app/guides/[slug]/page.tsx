import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { AdSenseScript } from "@/components/marketing/AdSenseScript";
import { GuideChecklist } from "@/components/marketing/GuideChecklist";
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Lagos",
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
    image: [`${SITE_URL}${meta.coverImage.src}`, socialImage],
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
    <div className="min-h-[100dvh] bg-paper text-foundation-700">
      <Nav />

      <main>
        <article className="mx-auto max-w-3xl px-6 pt-14 pb-20 md:pt-20">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted transition hover:text-foundation-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foundation-700"
          >
            All guides
          </Link>

          <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-foundation-300">
            {meta.category}
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.02em] text-foundation-700">
            {meta.heading}
          </h1>
          <p className="mt-4 text-[14px] text-ink-muted">
            By{" "}
            <Link
              href="/editorial-policy"
              className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
            >
              {meta.author}
            </Link>
            <span aria-hidden="true"> · </span>
            Published{" "}
            <time dateTime={meta.datePublished}>
              {formatDate(meta.datePublished)}
            </time>
            <span aria-hidden="true"> · </span>
            {meta.readingMinutes} min read
          </p>
          {meta.dateModified && meta.dateModified !== meta.datePublished && (
            <p className="mt-2 text-sm text-ink-muted">
              Updated{" "}
              <time dateTime={meta.dateModified}>
                {formatDate(meta.dateModified)}
              </time>
            </p>
          )}

          <figure className="mt-8 overflow-hidden rounded-2xl border border-foundation-700/10 bg-white">
            <Image
              src={meta.coverImage.src}
              alt={meta.coverImage.alt}
              width={1400}
              height={900}
              priority
              sizes="(max-width: 768px) calc(100vw - 48px), 720px"
              className="block aspect-[16/10] w-full object-cover"
            />
          </figure>

          {meta.standfirst && (
            <p className="mt-8 border-l-2 border-cryola-400 pl-5 text-[19px] leading-relaxed text-foundation-700 md:text-[21px]">
              {meta.standfirst}
            </p>
          )}

          {meta.scopeNote && (
            <p className="mt-5 rounded-xl border border-foundation-700/10 bg-white px-5 py-4 text-sm leading-relaxed text-ink-muted">
              {meta.scopeNote}
            </p>
          )}

          <div className="prose-legal mt-10">
            <Body />
          </div>

          {meta.articleImage && (
            <figure className="mt-8 overflow-hidden rounded-2xl border border-foundation-700/10 bg-white">
              <Image
                src={meta.articleImage.src}
                alt={meta.articleImage.alt}
                width={1200}
                height={800}
                sizes="(max-width: 768px) 100vw, 768px"
                className="block aspect-[3/2] w-full object-cover"
              />
              <figcaption className="border-t border-foundation-700/10 px-4 py-3 text-[12px] text-ink-muted">
                {meta.articleImage.caption}
              </figcaption>
            </figure>
          )}

          {meta.takeaways && meta.takeaways.length > 0 && (
            <section
              className="mt-12 border-y border-foundation-700/10 py-8"
              aria-labelledby="guide-takeaways"
            >
              <p className="eyebrow">Decision support</p>
              <h2
                id="guide-takeaways"
                className="mt-2 font-display text-[25px] font-bold text-foundation-700"
              >
                Before you decide
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {meta.takeaways.map((takeaway) => (
                  <div
                    key={takeaway.title}
                    className="rounded-xl bg-paper-deep/50 p-5"
                  >
                    <h3 className="text-[15px] font-bold text-foundation-700">
                      {takeaway.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                      {takeaway.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <GuideChecklist title="Use this checklist" items={meta.checklist} />

          {meta.faqs && meta.faqs.length > 0 && (
            <section className="mt-12" aria-labelledby="guide-faqs">
              <p className="eyebrow">Common questions</p>
              <h2
                id="guide-faqs"
                className="mt-2 font-display text-[25px] font-bold text-foundation-700"
              >
                Frequently asked questions
              </h2>
              <div className="mt-5 divide-y divide-foundation-700/10 border-y border-foundation-700/10">
                {meta.faqs.map((faq) => (
                  <details key={faq.question} className="group py-5">
                    <summary className="cursor-pointer list-none pr-8 text-[16px] font-bold text-foundation-700 marker:content-none">
                      {faq.question}
                    </summary>
                    <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

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
                      {source.publisher
                        ? `${source.publisher}: ${source.label}`
                        : source.label}
                    </a>
                    {source.note && (
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {source.note}
                      </p>
                    )}
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
              Keep your property records together
            </h2>
            <p className="mt-2 text-[15px] leading-[1.55] text-ink-muted">
              Explore Property360&apos;s tools for organising properties,
              leases, tenants and payment records. Check the available features
              and plan details for your account.
            </p>
            <Link
              href="/landlord"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-foundation-700 px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-foundation-700/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foundation-700"
            >
              Explore landlord tools
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
                    className="group overflow-hidden rounded-xl border border-foundation-700/10 bg-white transition hover:border-cryola-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foundation-700"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-paper-deep">
                      <Image
                        src={g.meta.coverImage.src}
                        alt=""
                        fill
                        sizes="(max-width: 639px) calc(100vw - 48px), 350px"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-5">
                      <p className="mb-2 text-sm font-semibold text-ink-muted">
                        {g.meta.category} · {g.meta.readingMinutes} min read
                      </p>
                      <h3 className="text-[16px] font-bold leading-snug text-foundation-700">
                        {g.meta.heading}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">
                        Read guide
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

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
