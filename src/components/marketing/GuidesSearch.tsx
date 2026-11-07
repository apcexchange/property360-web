"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type GuideCard = {
  slug: string;
  heading: string;
  description: string;
  category: string;
  readingMinutes: number;
  standfirst?: string;
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
        `${guide.heading} ${guide.description} ${guide.category}`
          .toLocaleLowerCase()
          .includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, guides, query]);

  return (
    <>
      <div className="mb-8 rounded-2xl border border-foundation-700/10 bg-white p-5 md:p-6">
        <label
          htmlFor="guide-search"
          className="block text-[13px] font-semibold text-foundation-700"
        >
          Find an answer
        </label>
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “agent fees” or “rent increase”"
          className="mt-2 w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-3 text-[15px] outline-none transition focus:border-foundation-700 focus:ring-2 focus:ring-cryola-300"
        />
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter guides by topic">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition ${
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

      <p className="mb-4 text-[13px] text-ink-muted" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group overflow-hidden rounded-2xl border border-foundation-700/10 bg-white transition hover:border-cryola-400 hover:shadow-sm"
            >
              <div className="overflow-hidden bg-foundation-700">
                <img
                  src={`/guides/${guide.slug}/opengraph-image`}
                  alt=""
                  className="aspect-[1.91/1] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-cryola-500">
                  {guide.category}
                </span>
                <h2 className="mt-2 text-[20px] font-bold leading-snug text-foundation-700">
                  {guide.heading}
                </h2>
                <p className="mt-2 flex-1 text-[15px] leading-[1.5] text-ink-muted">
                  {guide.standfirst ?? guide.description}
                </p>
                <span className="mt-4 text-[13px] font-semibold text-foundation-700">
                  Read guide · {guide.readingMinutes} min
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-foundation-700/20 bg-white p-8 text-center">
          <p className="font-semibold text-foundation-700">No guide found yet.</p>
          <p className="mt-2 text-[14px] text-ink-muted">
            Try a different phrase or choose another topic.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-4 rounded-full bg-foundation-700 px-4 py-2 text-[13px] font-semibold text-paper"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
