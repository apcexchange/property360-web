"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { SearchInput, Select } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminListingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listingStatus, setListingStatus] = useState("");
  const [moderationStatus, setModerationStatus] = useState("");
  const limit = 25;
  const qc = useQueryClient();
  const moderate = useMutation({
    mutationFn: ({ id, status, listingPurpose }: { id: string; status?: "approved" | "rejected" | "paused"; listingPurpose?: "rent" | "sale" | "shortlet" }) =>
      adminApi.setListingModeration(id, status, undefined, listingPurpose),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "listings", { page, search, listingStatus, moderationStatus }],
    queryFn: () =>
      adminApi.listListings({
        page,
        limit,
        search: search || undefined,
        status: listingStatus || undefined,
        moderationStatus: moderationStatus || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Marketplace listings"
            description="Publish and review vacant units only, including properties managed for landlords."
            filters={
              <>
                <SearchInput
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1); }}
                  placeholder="Search title, description, unit…"
                  className="w-full sm:w-72"
                />
                <Select
                  value={moderationStatus}
                  onChange={(v) => { setModerationStatus(v); setPage(1); }}
                  aria-label="Review status"
                >
                  <option value="">All review statuses</option>
                  <option value="pending">Pending approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paused">Paused</option>
                </Select>
                <Select
                  value={listingStatus}
                  onChange={(v) => { setListingStatus(v); setPage(1); }}
                  aria-label="Listing status"
                >
                  <option value="">All listing statuses</option>
                  <option value="active">Active</option>
                  <option value="reserved">Reserved</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </>
            }
          />

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Vacant units only — occupied homes are never shown or publishable here.
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty={moderationStatus === "pending" ? "No pending approvals" : "No listings found"}
            emptyDescription={
              moderationStatus === "pending"
                ? "Vacant units awaiting review will appear here."
                : "No vacant units match these filters."
            }
            onRowClick={(listing) => router.push(`/admin/listings/${listing._id}`)}
            columns={[
              {
                key: "title",
                header: "Listing",
                render: (r) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foundation-700">
                      {r.listingTitle ?? r.property?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {r.property?.name ? `${r.property.name} · ` : ""}Unit {r.unitNumber}
                      {r.bedrooms ? ` · ${r.bedrooms} bd` : ""}
                    </p>
                  </div>
                ),
              },
              {
                key: "landlord",
                header: "Landlord",
                render: (r) =>
                  r.property?.landlord
                    ? `${r.property.landlord.firstName ?? ""} ${r.property.landlord.lastName ?? ""}`.trim() ||
                      r.property.landlord.email
                    : "—",
              },
              {
                key: "location",
                header: "Location",
                render: (r) =>
                  [r.property?.address?.city, r.property?.address?.state]
                    .filter(Boolean)
                    .join(", ") || "—",
              },
              {
                key: "rentAmount",
                header: "Rent",
                render: (r) => (
                  <div>
                    <p className="font-medium text-foundation-700">{formatNgn(r.rentAmount)}</p>
                    {r.isNegotiable && (
                      <p className="text-xs text-ink-muted">negotiable</p>
                    )}
                  </div>
                ),
              },
              {
                key: "preferredTenantType",
                header: "Tenant type",
                render: (r) => (
                  <span className="text-xs capitalize text-ink-muted">
                    {r.preferredTenantType ?? "any"}
                  </span>
                ),
              },
              {
                key: "listingPurpose",
                header: "Listing type",
                render: (r) => (
                  <select
                    aria-label={`Listing type for ${r.listingTitle ?? r.property?.name ?? `unit ${r.unitNumber}`}`}
                    value={r.listingPurpose ?? "rent"}
                    disabled={moderate.isPending}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => moderate.mutate({ id: r._id, listingPurpose: event.target.value as "rent" | "sale" | "shortlet" })}
                    className="rounded-lg border border-foundation-700/15 bg-paper px-2 py-1 text-xs font-medium text-foundation-700"
                  >
                    <option value="rent">For rent</option>
                    <option value="sale">For sale</option>
                    <option value="shortlet">Shortlet</option>
                  </select>
                ),
              },
              { key: "listedAt", header: "Listed", render: (r) => formatDate(r.listedAt) },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <StatusBadge
                    value={
                      r.isListed && r.listingStatus === "active" && r.moderationStatus === "approved"
                        ? "public"
                        : r.moderationStatus ?? "not published"
                    }
                  />
                ),
              },
              {
                key: "actions",
                header: "Review",
                className: "sticky right-0 z-10 min-w-[210px] bg-surface",
                render: (r) => {
                  const isPublic = r.isListed && r.listingStatus === "active" && r.moderationStatus === "approved";
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {!isPublic && (
                        <button onClick={() => moderate.mutate({ id: r._id, status: "approved" })} disabled={moderate.isPending} className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50">Publish</button>
                      )}
                      {isPublic && (
                        <button onClick={() => moderate.mutate({ id: r._id, status: "paused" })} disabled={moderate.isPending} className="rounded-full border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-800 disabled:opacity-50">Pause</button>
                      )}
                      <button onClick={() => moderate.mutate({ id: r._id, status: "rejected" })} disabled={moderate.isPending} className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50">Reject</button>
                    </div>
                  );
                },
              },
            ]}
          />

          <Pagination
            page={page}
            total={data?.total ?? 0}
            limit={limit}
            onChange={setPage}
          />
        </div>
      </main>
    </>
  );
}
