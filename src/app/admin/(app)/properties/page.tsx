"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { SearchInput } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default function AdminPropertiesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "properties", { page, search }],
    queryFn: () =>
      adminApi.listProperties({ page, limit, search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="All properties"
            description="Across every landlord on the platform."
            filters={
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search by name or city…"
                className="w-full sm:w-80"
              />
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No properties found"
            emptyDescription="No landlords have created properties yet, or your search returned no results."
            columns={[
              {
                key: "name",
                header: "Name",
                render: (r) => <span className="font-medium text-foundation-700">{r.name}</span>,
              },
              {
                key: "landlord",
                header: "Landlord",
                render: (r) =>
                  r.landlord
                    ? `${r.landlord.firstName ?? ""} ${r.landlord.lastName ?? ""}`.trim() ||
                      r.landlord.email
                    : "—",
              },
              { key: "units", header: "Units", render: (r) => r.units ?? "—" },
              {
                key: "location",
                header: "Location",
                render: (r) =>
                  [r.address?.city, r.address?.state].filter(Boolean).join(", ") || "—",
              },
              { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
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
