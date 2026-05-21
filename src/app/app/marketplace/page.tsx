"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Inbox } from "lucide-react";
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

  return (
    <>
      <AppTopbar
        title="Marketplace"
        subtitle="Listings + incoming reservation requests"
        actions={
          <Link
            href="/app/marketplace/list-unit"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            List a vacant unit
          </Link>
        }
      />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
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
            ) : (listings.data ?? []).filter((l) => l.isListed).length === 0 ? (
              <EmptyState
                title="No active listings"
                body="List a vacant unit to receive reservation requests from prospective tenants."
                cta={{ label: "List a unit", href: "/app/marketplace/list-unit" }}
              />
            ) : (
              <Card className="divide-y divide-foundation-700/10">
                {listings
                  .data!.filter((l) => l.isListed)
                  .map((l) => (
                    <ListingRow
                      key={l._id}
                      listing={l}
                      onUnlist={(unitId) => {
                        if (confirm("Remove this listing from the marketplace?"))
                          unlist.mutate(unitId);
                      }}
                      removing={unlist.isPending}
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

function ListingRow({
  listing,
  onUnlist,
  removing,
}: {
  listing: Listing;
  onUnlist: (unitId: string) => void;
  removing: boolean;
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
          {unit && ` · ${formatNgn(unit.rentAmount)}/${unit.rentPeriod ?? "year"}`}
        </p>
        {listing.listedAt && (
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            Listed {formatDate(listing.listedAt)}
            {listing.reservationCount
              ? ` · ${listing.reservationCount} interest`
              : ""}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
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
