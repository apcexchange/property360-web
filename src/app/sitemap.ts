import type { MetadataRoute } from "next";
import { getListings } from "@/lib/listings-api";
import { guides } from "@/content/guides";
import { resolveLocationSlug, slugifyLocation } from "@/lib/nigeria-locations";

const SITE_URL = "https://property360.africa";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/listings`, lastModified, changeFrequency: "hourly", priority: 0.95 },
    { url: `${SITE_URL}/landlord`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/tenant`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/agents`, lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/for-agencies`, lastModified, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/communities`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/guides`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/onboarding`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/billing`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/support`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/delete-account`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  const guideEntries: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${SITE_URL}/guides/${g.meta.slug}`,
    lastModified: new Date(`${g.meta.dateModified ?? g.meta.datePublished}T00:00:00`),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  // Pull as many listings as one page allows so each detail page gets indexed.
  // If the backend returns more than `limit`, the rest will simply not appear
  // in this sitemap shard, acceptable for now; revisit if the marketplace
  // grows past ~500 active listings.
  let listingEntries: MetadataRoute.Sitemap = [];
  let locationEntries: MetadataRoute.Sitemap = [];
  try {
    const { listings } = await getListings({ limit: 200 });
    listingEntries = listings.map((l) => ({
      url: `${SITE_URL}/listings/${l.id}`,
      lastModified: l.listedAt ? new Date(l.listedAt) : lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    // Only surface location pages that actually have inventory (derived from
    // the states/cities present in the listings above) so we never publish
    // thin, empty location pages to the index.
    const slugs = new Set<string>();
    for (const l of listings) {
      const { state, city } = l.property?.address ?? {};
      if (state) slugs.add(slugifyLocation(state));
      if (city) slugs.add(slugifyLocation(city));
    }
    locationEntries = [...slugs]
      .filter((slug) => resolveLocationSlug(slug))
      .map((slug) => ({
        url: `${SITE_URL}/listings/in/${slug}`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.75,
      }));
  } catch {
    // Backend down at build/revalidate time, fall back to static entries only.
  }

  return [...staticEntries, ...guideEntries, ...listingEntries, ...locationEntries];
}
