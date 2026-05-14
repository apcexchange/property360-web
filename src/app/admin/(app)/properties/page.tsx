"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
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

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Topbar title="Properties" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foundation-700">All properties</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Across every landlord on the platform.
              </p>
            </div>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or city…"
              className="w-72 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
            />
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
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

          {total > limit && (
            <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foundation-700 hover:bg-canvas disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foundation-700 hover:bg-canvas disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
