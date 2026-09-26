"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { SearchInput, Select } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminListingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const limit = 25;
  const qc = useQueryClient();
  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "paused" }) =>
      adminApi.setListingModeration(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "listings", { page, search, status }],
    queryFn: () =>
      adminApi.listListings({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
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
            description="Review and control public marketplace listings."
            filters={
              <>
                <SearchInput
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1); }}
                  placeholder="Search title, description, unit…"
                  className="w-full sm:w-72"
                />
                <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="reserved">Reserved</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No listings found"
            emptyDescription="No vacant units have been listed on the marketplace yet."
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
              { key: "listedAt", header: "Listed", render: (r) => formatDate(r.listedAt) },
              {
                key: "status",
                header: "Status",
                render: (r) => <StatusBadge value={r.moderationStatus ?? "approved"} />,
              },
              {
                key: "actions",
                header: "Review",
                render: (r) => (
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => moderate.mutate({ id: r._id, status: "approved" })} disabled={moderate.isPending} className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50">Approve</button>
                    <button onClick={() => moderate.mutate({ id: r._id, status: "paused" })} disabled={moderate.isPending} className="rounded-full border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-800 disabled:opacity-50">Pause</button>
                    <button onClick={() => moderate.mutate({ id: r._id, status: "rejected" })} disabled={moderate.isPending} className="rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50">Reject</button>
                  </div>
                ),
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
