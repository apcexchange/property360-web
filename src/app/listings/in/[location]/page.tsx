import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { ListingCard } from "@/components/marketing/ListingCard";
import { getListings, type ListingsResult } from "@/lib/listings-api";
import {
  resolveLocationSlug,
  TOP_LOCATIONS,
  TOP_LOCATION_SLUGS,
} from "@/lib/nigeria-locations";

export const revalidate = 60;

const SITE_URL = "https://property360.africa";

type Params = { location: string };

/** Pre-render the curated high-demand locations; others render on demand. */
export function generateStaticParams() {
  return TOP_LOCATION_SLUGS.map((location) => ({ location }));
}

async function loadListings(slug: string): Promise<ListingsResult> {
  const loc = resolveLocationSlug(slug);
  if (!loc) {
    return { listings: [], meta: { total: 0, page: 1, limit: 48, totalPages: 0 } };
  }
  const query = loc.kind === "state" ? { state: loc.name } : { city: loc.name };
  return getListings({ ...query, limit: 48 }).catch(() => ({
    listings: [],
    meta: { total: 0, page: 1, limit: 48, totalPages: 0 },
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { location } = await params;
  const loc = resolveLocationSlug(location);
  if (!loc) return { title: "Location not found" };

  const { meta } = await loadListings(location);
  const title = `Homes for rent in ${loc.label} | Property360`;
  const description = `Browse ${
    meta.total > 0 ? `${meta.total.toLocaleString("en-NG")} verified ` : "verified "
  }rental homes in ${loc.label}, Nigeria. Real listings tied to identity-verified landlords. Reserve and pay securely with Paystack on Property360.`;

  return {
    title,
    description,
    alternates: { canonical: `/listings/in/${loc.slug}` },
    // Empty location pages add no value to the index, keep them out until
    // there's inventory, while still serving a helpful page to direct visitors.
    robots: meta.total === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/listings/in/${loc.slug}`,
      type: "website",
    },
  };
}

export default async function LocationListingsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { location } = await params;
  const loc = resolveLocationSlug(location);
  if (!loc) notFound();

  const { listings, meta } = await loadListings(location);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Listings",
        item: `${SITE_URL}/listings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: loc.label,
        item: `${SITE_URL}/listings/in/${loc.slug}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Homes for rent in ${loc.label}`,
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/listings/${l.id}`,
    })),
  };

  const others = TOP_LOCATIONS.filter((t) => t.slug !== loc.slug).slice(0, 12);

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      <PageHero
        eyebrow="Homes for rent"
        title={
          <>
            Homes for rent in
            <br />
            <span className="text-cryola-500">{loc.label}.</span>
          </>
        }
        subtitle={`Verified rentals in ${loc.label}${
          loc.kind === "city" && loc.state ? `, ${loc.state}` : ""
        }, every unit tied to an identity-verified landlord. Browse without signing in; reserve in the app when you're ready.`}
      />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <p className="mb-6 text-[13px] text-ink-muted">
          {meta.total > 0
            ? `${meta.total.toLocaleString("en-NG")} ${
                meta.total === 1 ? "home" : "homes"
              } in ${loc.label}`
            : `No homes listed in ${loc.label} yet.`}
        </p>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-foundation-700/20 bg-surface p-12 text-center">
            <p className="font-display text-[22px] font-semibold text-foundation-700">
              Nothing in {loc.label} just yet.
            </p>
            <p className="mt-2 text-[14px] text-ink-muted">
              New homes are listed regularly. Check back soon, or browse every
              available home across Nigeria.
            </p>
            <Link
              href="/listings"
              className="mt-5 inline-flex rounded-full bg-foundation-700 px-5 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              Browse all homes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Internal linking: help crawlers and renters reach other markets. */}
      <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <p className="eyebrow">Browse other locations</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/listings/in/${o.slug}`}
                className="rounded-full border border-foundation-700/12 bg-surface px-4 py-2 text-[13.5px] font-medium text-foundation-700 transition hover:border-foundation-700/30"
              >
                {o.label}
              </Link>
            ))}
            <Link
              href="/listings"
              className="rounded-full bg-foundation-700 px-4 py-2 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              All homes →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
