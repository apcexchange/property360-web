"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, MapPin, ShieldCheck, Star, UserRound } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { StatusBadge } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui/Filters";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

const purposeLabel = (purpose?: string) =>
  purpose === "sale" ? "For sale" : purpose === "shortlet" ? "Shortlet" : "For rent";

export default function AdminListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["admin", "listings", id],
    queryFn: () => adminApi.getListingDetail(id),
  });
  const review = useMutation({
    mutationFn: ({ status, listingPurpose, isFeatured }: { status?: "approved" | "rejected" | "paused"; listingPurpose?: "rent" | "sale" | "shortlet"; isFeatured?: boolean }) =>
      adminApi.setListingModeration(id, status, undefined, listingPurpose, isFeatured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
    },
  });

  if (isLoading) return <><Topbar trail="Listing" /><main className="flex-1 px-6 py-8 text-sm text-ink-muted">Loading listing…</main></>;
  if (isError || !listing) return <><Topbar trail="Listing" /><main className="flex-1 px-6 py-8"><p className="text-sm text-error">This listing is unavailable, occupied, or could not be loaded.</p><Link href="/admin/listings" className="mt-4 inline-flex text-sm font-semibold text-foundation-700 underline">Back to listings</Link></main></>;

  const property = listing.property;
  const images = property?.images ?? [];
  const details = listing.listingDetails;
  const publisher = property?.owner;
  const agent = property?.agent;
  const isPublic = listing.isListed && listing.listingStatus === "active" && listing.moderationStatus === "approved";

  return (
    <>
      <Topbar trail="Marketplace listing" />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin/listings" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted transition hover:text-foundation-700"><ArrowLeft className="h-4 w-4" /> All listings</Link>
          <PageHeader
            eyebrow="Marketplace review"
            title={listing.listingTitle || property?.name || `Unit ${listing.unitNumber}`}
            description={[property?.name, listing.unitNumber ? `Unit ${listing.unitNumber}` : undefined, property?.address?.city, property?.address?.state].filter(Boolean).join(" · ")}
            actions={<><StatusBadge value={isPublic ? "public" : listing.moderationStatus ?? "not published"} /><StatusBadge value={purposeLabel(listing.listingPurpose)} /></>}
          />

          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="overflow-hidden rounded-2xl border border-rule bg-surface">
              {images.length ? (
                <div className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-3">
                  {images.slice(0, 6).map((src, index) => (
                    <figure key={src} className="relative aspect-[4/3] bg-canvas">
                      <Image src={src} alt={property?.imageCaptions?.find((item) => item.url === src)?.caption || `Listing photo ${index + 1}`} fill sizes="(min-width: 1024px) 360px, 50vw" className="object-cover" />
                      {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-foundation-700/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-paper">Cover</span>}
                      {property?.imageCaptions?.find((item) => item.url === src)?.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-foundation-700/75 px-2 py-1.5 text-[11px] text-paper">{property.imageCaptions.find((item) => item.url === src)?.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              ) : <div className="grid min-h-60 place-items-center text-sm text-ink-muted">No photos uploaded</div>}
            </section>

            <aside className="rounded-2xl border border-rule bg-surface p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Review controls</p>
              <label className="mt-4 block text-[12px] font-semibold text-foundation-700">Listing type
                <select value={listing.listingPurpose ?? "rent"} disabled={review.isPending} onChange={(event) => review.mutate({ listingPurpose: event.target.value as "rent" | "sale" | "shortlet" })} className="mt-1.5 w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm font-medium text-foundation-700">
                  <option value="rent">For rent</option><option value="sale">For sale</option><option value="shortlet">Shortlet</option>
                </select>
              </label>
              <div className="mt-5 grid gap-2">
                {!isPublic && <Button variant="primary" size="sm" disabled={review.isPending} onClick={() => review.mutate({ status: "approved" })}>{review.isPending ? "Saving…" : "Publish listing"}</Button>}
                {isPublic && <Button variant="secondary" size="sm" disabled={review.isPending} onClick={() => review.mutate({ status: "paused" })}>Pause listing</Button>}
                {isPublic && <Button variant={listing.isFeatured ? "secondary" : "success"} size="sm" disabled={review.isPending} onClick={() => review.mutate({ isFeatured: !listing.isFeatured })}><Star className={`h-3.5 w-3.5 ${listing.isFeatured ? "fill-cryola-300 text-cryola-500" : ""}`} /> {listing.isFeatured ? "Remove from featured" : "Feature on home page"}</Button>}
                <Button variant="danger" size="sm" disabled={review.isPending} onClick={() => review.mutate({ status: "rejected" })}>Reject listing</Button>
              </div>
              {review.isError && <p className="mt-3 text-xs text-error">Couldn&apos;t save this change. Try again.</p>}
            </aside>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailSection title="Listing">
              <Metric label="Price" value={formatNgn(listing.rentAmount)} />
              {listing.originalPrice && <Metric label="Previous price" value={formatNgn(listing.originalPrice)} />}
              <Metric label="Type" value={purposeLabel(listing.listingPurpose)} />
              <Metric label="Listed" value={listing.listedAt ? formatDate(listing.listedAt) : "Not submitted"} />
              <Metric label="Availability confirmed" value={listing.listingLastConfirmedAt ? formatDate(listing.listingLastConfirmedAt) : "Not yet"} />
            </DetailSection>
            <DetailSection title="Property">
              <Metric label="Property type" value={property?.propertyType?.replace(/_/g, " ") || "—"} />
              <Metric label="Bedrooms" value={listing.bedrooms ?? "—"} />
              <Metric label="Bathrooms" value={listing.bathrooms ?? "—"} />
              {details?.landSize != null && <Metric label="Land size" value={`${details.landSize} ${details.landUnit ?? "sqm"}`} />}
              {details?.titleDocument && <Metric label="Title document" value={details.titleDocument} />}
              {details?.estateName && <Metric label="Estate" value={details.estateName} />}
              {details?.hasBq && <Metric label="BQ" value="Included" />}
              {details?.maxGuests != null && <Metric label="Guest capacity" value={`${details.maxGuests} guests`} />}
            </DetailSection>
            <DetailSection title="Publisher">
              <p className="flex items-center gap-2 text-sm font-semibold text-foundation-700"><UserRound className="h-4 w-4" /> {publisher ? `${publisher.firstName ?? ""} ${publisher.lastName ?? ""}`.trim() || publisher.email : "Unknown publisher"}</p>
              {publisher?.email && <p className="mt-1 text-sm text-ink-muted">{publisher.email}</p>}
              {agent && <p className="mt-4 text-sm text-ink-muted">Managed by {`${agent.firstName ?? ""} ${agent.lastName ?? ""}`.trim() || agent.email}</p>}
              {property?.ownerAuthorisationConfirmedAt && <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Publisher authorisation confirmed</p>}
            </DetailSection>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <DetailSection title="Description"><p className="whitespace-pre-line text-sm leading-6 text-ink-body">{listing.listingDescription || property?.description || "No description supplied."}</p></DetailSection>
            <DetailSection title="Location"><p className="flex gap-2 text-sm text-ink-body"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{[property?.address?.street, property?.address?.city, property?.address?.state].filter(Boolean).join(", ") || "No address supplied"}</p>{listing.availableFrom && <p className="mt-4 flex gap-2 text-sm text-ink-body"><CalendarDays className="h-4 w-4" /> Available {formatDate(listing.availableFrom)}</p>}</DetailSection>
          </div>
        </div>
      </main>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-rule bg-surface p-5"><h2 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{title}</h2><div className="mt-4 space-y-3">{children}</div></section>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2.5 last:border-0 last:pb-0"><span className="text-xs text-ink-muted">{label}</span><span className="text-right text-sm font-medium capitalize text-foundation-700">{value}</span></div>;
}
