import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { ListingCard } from "@/components/marketing/ListingCard";
import { ListingFilters } from "@/components/marketing/ListingFilters";
import { Pagination } from "@/components/marketing/Pagination";
import { getListings } from "@/lib/listings-api";
import { TOP_LOCATIONS } from "@/lib/nigeria-locations";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse homes for rent in Nigeria",
  description:
    "Find verified rental homes across Lagos, Abuja, Port Harcourt and beyond. Filter by location, bedrooms, and price. Powered by Property360.",
  alternates: { canonical: "/listings" },
  openGraph: {
    title: "Browse homes for rent in Nigeria, Property360",
    description:
      "Find verified rental homes across Nigeria. Filter by location, bedrooms, and price.",
    url: "https://property360.africa/listings",
    type: "website",
  },
};

type SearchParams = {
  page?: string;
  search?: string;
  bedrooms?: string;
  maxPrice?: string;
  minPrice?: string;
  state?: string;
  city?: string;
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const page = Number(sp.page) || 1;
  const bedrooms = sp.bedrooms ? Number(sp.bedrooms) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;

  const result = await getListings({
    page,
    limit: 24,
    search: sp.search,
    bedrooms,
    maxPrice,
    minPrice,
    state: sp.state,
    city: sp.city,
  }).catch(() => ({
    listings: [],
    meta: { total: 0, page: 1, limit: 24, totalPages: 0 },
  }));

  const baseQuery = new URLSearchParams();
  if (sp.search) baseQuery.set("search", sp.search);
  if (sp.bedrooms) baseQuery.set("bedrooms", sp.bedrooms);
  if (sp.maxPrice) baseQuery.set("maxPrice", sp.maxPrice);
  if (sp.state) baseQuery.set("state", sp.state);
  if (sp.city) baseQuery.set("city", sp.city);

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Marketplace"
        title={
          <>
            Find a home in Nigeria.
            <br />
            <span className="text-cryola-500">Real listings, verified landlords.</span>
          </>
        }
        subtitle="Every unit on Property360 is tied to a real landlord or agent, no ghost listings, no surprise fees. Browse without signing in; reserve in the app when you're ready."
      >
        <ListingFilters
          defaultSearch={sp.search ?? ""}
          defaultBedrooms={sp.bedrooms ?? ""}
          defaultMaxPrice={sp.maxPrice ?? ""}
          defaultState={sp.state ?? ""}
        />
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <p className="mb-6 text-[13px] text-ink-muted">
          {result.meta.total > 0
            ? `${result.meta.total.toLocaleString("en-NG")} ${
                result.meta.total === 1 ? "home" : "homes"
              } available`
            : "No homes match those filters yet."}
        </p>

        {result.listings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}

        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          baseQuery={baseQuery}
        />
      </section>

      <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <p className="eyebrow">Browse by location</p>
          <h2 className="mt-2 font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
            Find a home in your city.
          </h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {TOP_LOCATIONS.map((o) => (
              <Link
                key={o.slug}
                href={`/listings/in/${o.slug}`}
                className="rounded-full border border-foundation-700/12 bg-surface px-4 py-2 text-[13.5px] font-medium text-foundation-700 transition hover:border-foundation-700/30"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-foundation-700/20 bg-surface p-12 text-center">
      <p className="font-display text-[22px] font-semibold text-foundation-700">
        Nothing here yet.
      </p>
      <p className="mt-2 text-[14px] text-ink-muted">
        Try widening your filters, or check back in a few days as more landlords
        list units.
      </p>
      <Link
        href="/listings"
        className="mt-5 inline-flex rounded-full bg-foundation-700 px-5 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        Clear filters
      </Link>
    </div>
  );
}
