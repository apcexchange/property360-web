"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { GuideCover } from "@/content/guides/types";

type GuideCard = {
  slug: string;
  heading: string;
  description: string;
  category: string;
  readingMinutes: number;
  standfirst?: string;
  coverImage: GuideCover;
  datePublished: string;
  tags?: string[];
};

export function GuidesSearch({ guides }: { guides: GuideCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(guides.map((guide) => guide.category))];

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return guides.filter((guide) => {
      const matchesCategory = category === "All" || guide.category === category;
      const matchesQuery =
        !needle ||
        `${guide.heading} ${guide.description} ${guide.standfirst ?? ""} ${guide.category} ${guide.tags?.join(" ") ?? ""}`
          .toLocaleLowerCase()
          .includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, guides, query]);

  const showFeatured = !query.trim() && category === "All";

  return (
    <>
      <div className="mb-8 rounded-2xl border border-foundation-700/10 bg-white p-5 md:p-6">
        <label
          htmlFor="guide-search"
          className="block text-sm font-semibold text-foundation-700"
        >
          Find an answer
        </label>
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “agent fees”, “inspection” or “repairs”"
          className="mt-2 w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-3 text-base transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foundation-700"
        />
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter guides by topic"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foundation-700 ${
                category === item
                  ? "border-foundation-700 bg-foundation-700 text-paper"
                  : "border-foundation-700/15 bg-white text-foundation-700 hover:border-foundation-700/40"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p
        className="mb-4 text-sm text-ink-muted"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((guide, index) => {
            const featured = showFeatured && index === 0;
            const wide =
              featured ||
              (showFeatured &&
                filtered.length % 2 === 0 &&
                index === filtered.length - 1);
            return (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className={`group flex overflow-hidden rounded-2xl border border-foundation-700/10 bg-white transition hover:border-cryola-400 hover:shadow-sm active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foundation-700 ${wide ? "flex-col sm:col-span-2 md:grid md:grid-cols-[1.1fr_1fr]" : "flex-col"}`}
              >
                <div
                  className={`relative overflow-hidden bg-paper-deep ${wide ? "aspect-[16/10] md:aspect-auto md:min-h-96" : "aspect-[16/9]"}`}
                >
                  <Image
                    src={guide.coverImage.src}
                    alt=""
                    fill
                    priority={featured}
                    sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1152px) calc((100vw - 72px) / 2), 540px"
                    className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
                  />
                </div>
                <div
                  className={`flex flex-1 flex-col ${wide ? "justify-center p-6 md:p-10" : "p-6"}`}
                >
                  {featured && (
                    <span className="mb-5 w-fit rounded-full bg-cryola-300/40 px-3 py-1 text-sm font-semibold text-foundation-700">
                      Latest guide
                    </span>
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wide text-foundation-300">
                    {guide.category}
                  </span>
                  <h2
                    className={`mt-2 font-display font-bold leading-snug text-foundation-700 ${featured ? "text-2xl md:text-3xl" : "text-xl"}`}
                  >
                    {guide.heading}
                  </h2>
                  <p
                    className={`mt-3 text-base leading-relaxed text-ink-muted ${featured ? "" : "flex-1"}`}
                  >
                    {guide.standfirst ?? guide.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <time dateTime={guide.datePublished}>
                      {new Date(
                        `${guide.datePublished}T00:00:00Z`,
                      ).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Africa/Lagos",
                      })}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span>{guide.readingMinutes} min read</span>
                  </div>
                  <span className="mt-5 text-sm font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">
                    Read the guide
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-foundation-700/20 bg-white p-8 text-center">
          <p className="font-semibold text-foundation-700">
            No guide found yet.
          </p>
          <p className="mt-2 text-base text-ink-muted">
            Try a different phrase or choose another topic.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-4 rounded-full bg-foundation-700 px-4 py-2 text-sm font-semibold text-paper active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foundation-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
