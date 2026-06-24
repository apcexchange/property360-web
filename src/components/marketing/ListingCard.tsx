import Link from "next/link";
import Image from "next/image";
import { BedDouble, Bath, MapPin, BadgeCheck } from "lucide-react";
import {
  Listing,
  formatNaira,
  listingImage,
  listingTitle,
  locationLabel,
  isLandlordVerified,
} from "@/lib/listings-api";

export function ListingCard({ listing }: { listing: Listing }) {
  const img = listingImage(listing);
  const reserved = listing.listingStatus === "reserved";
  const verified = isLandlordVerified(listing);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-foundation-700/10 bg-surface transition hover:shadow-[0_28px_56px_-30px_rgb(15_39_44_/_0.3)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-foundation-700/5">
        {img ? (
          <Image
            src={img}
            alt={listingTitle(listing)}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] uppercase tracking-[0.18em] text-ink-faint">
            No photo
          </div>
        )}
        {reserved && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
            Reserved
          </span>
        )}
        {listing.isNegotiable && !reserved && (
          <span className="absolute left-3 top-3 rounded-full bg-foundation-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cryola-300">
            Negotiable
          </span>
        )}
        {verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-semibold text-foundation-700 shadow-sm backdrop-blur">
            <BadgeCheck className="h-3 w-3 text-emerald-600" />
            Verified
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-1 text-[15px] font-semibold text-foundation-700">
          {listingTitle(listing)}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
          <MapPin className="h-3 w-3" /> {locationLabel(listing.property?.address)}
        </p>
        <div className="mt-3 flex items-center gap-4 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" /> {listing.bedrooms ?? "—"} bd
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" /> {listing.bathrooms ?? "—"} ba
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-5">
          <p className="text-[22px] font-extrabold tracking-[-0.025em] text-foundation-700 tabular">
            {formatNaira(listing.rentAmount)}
            <span className="ml-1 text-[12px] font-medium text-ink-muted">/year</span>
          </p>
          <span className="rounded-full bg-foundation-700/5 px-3 py-1 text-[11px] font-semibold text-foundation-700 transition group-hover:bg-foundation-700 group-hover:text-paper">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-foundation-700/10 bg-surface">
      <div className="aspect-[4/3] w-full animate-pulse bg-foundation-700/5" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-foundation-700/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-foundation-700/5" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-foundation-700/5" />
      </div>
    </div>
  );
}
