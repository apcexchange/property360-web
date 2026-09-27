"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarClock, CircleAlert, ExternalLink, Inbox, Plus } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, Listing } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

export default function MarketplacePage() {
  const qc = useQueryClient();
  const toast = useToast();
  const listings = useQuery({
    queryKey: ["marketplace", "my-listings"],
    queryFn: () => landlordApi.myListings(),
  });
  const requests = useQuery({
    queryKey: ["marketplace", "reservations"],
    queryFn: () => landlordApi.landlordReservationRequests(),
  });

  const unlist = useMutation({
    mutationFn: (unitId: string) => landlordApi.unlistUnit(unitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace", "my-listings"] });
      toast.success("Unit removed from the marketplace");
    },
    onError: (err) =>
      toast.error({
        title: "Couldn't remove the listing",
        body: err instanceof Error ? err.message : undefined,
      }),
  });
  const confirmListing = useMutation({
    mutationFn: (unitId: string) => landlordApi.confirmListingAvailability(unitId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketplace", "my-listings"] }); toast.success("Listing availability confirmed for 30 days"); },
  });
  const activeListings = (listings.data ?? []).filter((listing) => listing.isListed);
  const now = Date.now();
  const expiryThreshold = now + 7 * 24 * 60 * 60 * 1000;
  const pendingReview = activeListings.filter((listing) => listing.moderationStatus === "pending").length;
  const liveListings = activeListings.filter((listing) => !listing.moderationStatus || listing.moderationStatus === "approved").length;
  const attentionListings = activeListings.filter((listing) => {
    const expiry = listing.listingExpiresAt ? new Date(listing.listingExpiresAt).getTime() : null;
    return listing.moderationStatus === "paused" || listing.moderationStatus === "rejected" || (expiry != null && expiry <= expiryThreshold);
  }).length;
  const needsAttention = pendingReview > 0 || attentionListings > 0;

  return (
    <>
      <AppTopbar
        title="Your marketplace"
        subtitle="Manage listings, review status and incoming requests"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Browse all listings
            </Link>
            <Link
              href="/app/marketplace/list-unit"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              List an existing unit
            </Link>
            <Link
              href="/app/marketplace/new"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Post a property free
            </Link>
          </div>
        }
      />
      <PageContainer>
        {listings.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
          </div>
        ) : (
          <>
            <div className="grid border-y border-foundation-700/10 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewMetric icon={<BadgeCheck />} label="Live now" value={liveListings} detail="Visible to customers" />
              <OverviewMetric icon={<CalendarClock />} label="In review" value={pendingReview} detail="Awaiting approval" />
              <OverviewMetric icon={<CircleAlert />} label="Needs attention" value={attentionListings} detail="Expiry, pause or rejection" tone={attentionListings > 0 ? "attention" : undefined} />
              <OverviewMetric icon={<Inbox />} label="Reservation requests" value={(requests.data ?? []).length} detail="Across your listings" />
            </div>

            <div className={`mt-6 flex flex-col gap-4 border-l-2 px-5 py-1 sm:flex-row sm:items-center sm:justify-between ${needsAttention ? "border-amber-400" : "border-cryola-400"}`}>
              <div>
                <p className="text-[14px] font-semibold text-foundation-700">
                  {pendingReview > 0 ? `${pendingReview} ${pendingReview === 1 ? "listing is" : "listings are"} waiting for review.` : attentionListings > 0 ? "Keep your public listings current." : activeListings.length ? "Your marketplace is up to date." : "Your first listing starts here."}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                  {pendingReview > 0 ? "We will notify you once a listing is approved or needs an update." : attentionListings > 0 ? "Confirm availability before a listing expires, or review any moderation feedback below." : activeListings.length ? "Confirm availability every 30 days so customers only see current properties." : "Post a home, shop, plot, shortlet or hotel room. Standard listings are free."}
                </p>
              </div>
              {!activeListings.length && <Link href="/app/marketplace/new" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2.5 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"><Plus className="h-3.5 w-3.5" /> Post free</Link>}
            </div>
          </>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Active listings
            </h2>
            {listings.isLoading ? (
              <Card className="divide-y divide-foundation-700/10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </Card>
            ) : listings.isError ? (
              <ErrorBox
                message={(listings.error as Error)?.message}
                onRetry={() => listings.refetch()}
              />
            ) : activeListings.length === 0 ? (
              <EmptyState
                title="No active listings"
                body="List a vacant unit to receive reservation requests from prospective tenants."
                cta={{ label: "Post a property free", href: "/app/marketplace/new" }}
              />
            ) : (
              <Card className="divide-y divide-foundation-700/10">
                {activeListings
                  .map((l) => (
                    <ListingRow
                      key={l._id}
                      listing={l}
                      onUnlist={(unitId) => {
                        if (confirm("Remove this listing from the marketplace?"))
                          unlist.mutate(unitId);
                      }}
                      removing={unlist.isPending}
                      confirming={confirmListing.isPending}
                      onConfirm={(unitId) => confirmListing.mutate(unitId)}
                    />
                  ))}
              </Card>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Reservation requests
            </h2>
            {requests.isLoading ? (
              <Card className="p-4">
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ) : requests.isError ? (
              <ErrorBox
                message={(requests.error as Error)?.message}
                onRetry={() => requests.refetch()}
              />
            ) : (requests.data ?? []).length === 0 ? (
              <Card className="grid place-items-center p-8 text-center">
                <Inbox className="h-8 w-8 text-foundation-700/30" />
                <p className="mt-2 text-[13px] text-ink-muted">
                  No requests yet.
                </p>
              </Card>
            ) : (
              <Card className="divide-y divide-foundation-700/10">
                {requests.data!.slice(0, 5).map((r) => (
                  <Link
                    key={r._id}
                    href={`/app/marketplace/reservations/${r._id}`}
                    className="block p-4 transition hover:bg-foundation-700/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-foundation-700">
                        {r.tenant?.firstName} {r.tenant?.lastName}
                      </p>
                      <StatusPill
                        label={r.status}
                        tone={
                          r.status === "approved"
                            ? "good"
                            : r.status === "paid"
                            ? "good"
                            : r.status === "declined" || r.status === "cancelled"
                            ? "bad"
                            : "warn"
                        }
                      />
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-muted">
                      {typeof r.property === "object" ? r.property.name : ""}
                      {" · "}
                      {formatDate(r.createdAt)}
                    </p>
                  </Link>
                ))}
                {requests.data!.length > 5 && (
                  <Link
                    href="/app/marketplace/reservations"
                    className="block p-3 text-center text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                  >
                    View all {requests.data!.length} →
                  </Link>
                )}
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: "attention";
}) {
  return (
    <div className="border-b border-foundation-700/10 px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tone === "attention" ? "bg-amber-100 text-amber-800" : "bg-foundation-700/6 text-foundation-700"}`}>
        {icon}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">{label}</p>
      <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] text-foundation-700">{value}</p>
      <p className="mt-1.5 text-[11.5px] text-ink-muted">{detail}</p>
    </div>
  );
}

function ListingRow({
  listing,
  onUnlist,
  removing,
  confirming,
  onConfirm,
}: {
  listing: Listing;
  onUnlist: (unitId: string) => void;
  removing: boolean;
  confirming: boolean;
  onConfirm: (unitId: string) => void;
}) {
  const unit = typeof listing.unit === "object" ? listing.unit : null;
  const property =
    typeof listing.property === "object" ? listing.property : null;
  const unitId = unit?._id ?? (typeof listing.unit === "string" ? listing.unit : "");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foundation-700">
          {property?.name ?? "Property"} {unit && `· Unit ${unit.unitNumber}`}
        </p>
        <p className="mt-1 text-[12px] text-ink-muted">
          {unit ? `${unit.bedrooms} bed · ${unit.bathrooms} bath` : ""}
          {unit && ` · ${formatNgn(unit.rentAmount)}/${unit.rentPeriod ?? "annually"}`}
        </p>
        {listing.listedAt && (
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            Listed {formatDate(listing.listedAt)}
            {listing.reservationCount
              ? ` · ${listing.reservationCount} interest`
              : ""}
          </p>
        )}
        {listing.moderationStatus && listing.moderationStatus !== "approved" && (
          <p className="mt-1 text-[11.5px] font-medium text-amber-700">
            {listing.moderationStatus === "pending" ? "Pending review" : listing.moderationStatus === "paused" ? "Paused" : "Rejected"}
            {listing.moderationReason ? ` · ${listing.moderationReason}` : ""}
          </p>
        )}
        {listing.listingExpiresAt && (
          <p className="mt-1 text-[11px] text-ink-muted">Confirm by {formatDate(listing.listingExpiresAt)} to keep this listing live.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unitId && <button type="button" onClick={() => onConfirm(unitId)} disabled={confirming} className="rounded-full border border-emerald-200 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 disabled:opacity-50">Confirm available</button>}
        {unitId && (
          <a
            href={`https://property360.africa/listings/${unitId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ExternalLink className="h-3 w-3" /> View public
          </a>
        )}
        <button
          type="button"
          onClick={() => unitId && onUnlist(unitId)}
          disabled={removing}
          className="rounded-full border border-red-200 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          Unlist
        </button>
      </div>
    </div>
  );
}
