import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { ListingCard } from "@/components/marketing/ListingCard";
import { getListings } from "@/lib/listings-api";

/** Live marketplace preview for the home page. */
export async function FeaturedProperties() {
  const result = await getListings({ limit: 4 }).catch(() => ({
    listings: [],
    meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
  }));

  return (
    <section id="featured-properties" className="border-y border-foundation-700/10 bg-paper-deep/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Featured properties</p>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(1.9rem,4vw,2.7rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-foundation-700">
              Find your next place, from homes to plots.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-ink-muted">
              Fresh rentals, shortlets, commercial spaces and properties for sale from the Property360 marketplace.
            </p>
          </div>
          <Link
            href="/listings"
            className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700 hover:text-paper sm:self-auto"
          >
            View all properties
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {result.listings.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {result.listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-foundation-700/20 bg-paper p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-cryola-500" /><p className="text-[14px] text-ink-muted">New properties will appear here as they are published.</p></div>
            <Link href="/listings" className="text-[13px] font-semibold text-foundation-700 underline underline-offset-4">Browse marketplace</Link>
          </div>
        )}
      </div>
    </section>
  );
}
