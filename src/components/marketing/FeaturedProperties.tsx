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
    <section id="featured-properties" className="relative overflow-hidden border-y border-foundation-700/10 bg-foundation-700 py-20 text-paper sm:py-24">
      <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-cryola-300/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-cryola-500/20 blur-3xl" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cryola-300">Featured properties</p>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(2.1rem,4vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.025em] text-paper">
              Fresh properties, ready to discover.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-paper/70">
              Fresh rentals, shortlets, commercial spaces, land and properties for sale from the reviewed Property360 marketplace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Link href="/post-property" className="inline-flex items-center gap-1.5 rounded-full bg-cryola-300 px-5 py-2.5 text-[13px] font-bold text-foundation-700 transition hover:bg-cryola-200">Post a property free</Link>
            <Link
              href="/listings"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-paper/30 bg-paper/10 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-foundation-700"
            >
              View all properties
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {result.listings.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {result.listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-paper/25 bg-paper/10 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-cryola-300" /><p className="text-[14px] text-paper/75">New properties will appear here as they are published.</p></div>
            <Link href="/listings" className="text-[13px] font-semibold text-cryola-300 underline underline-offset-4">Browse marketplace</Link>
          </div>
        )}
      </div>
    </section>
  );
}
