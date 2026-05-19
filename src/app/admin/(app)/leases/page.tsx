"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { SearchInput, Select } from "@/components/admin/ui/Filters";
import { LeaseDetailDrawer } from "@/components/admin/LeaseDetailDrawer";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminLeasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "leases", { page, search, status }],
    queryFn: () =>
      adminApi.listLeases({
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
            title="All leases"
            description="Every active, pending, expired, and terminated lease on the platform."
            filters={
              <>
                <SearchInput
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1); }}
                  placeholder="Search tenant or landlord…"
                  className="w-full sm:w-72"
                />
                <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                  <option value="declined">Declined</option>
                </Select>
              </>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No leases match these filters"
            onRowClick={(r) => setSelectedLeaseId(r._id)}
            columns={[
              {
                key: "property",
                header: "Property",
                render: (r) => (
                  <div>
                    <p className="font-medium text-foundation-700">{r.property?.name ?? "—"}</p>
                    {r.unit?.unitNumber && (
                      <p className="text-xs text-ink-muted">Unit {r.unit.unitNumber}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "tenant",
                header: "Tenant",
                render: (r) =>
                  r.tenant
                    ? `${r.tenant.firstName ?? ""} ${r.tenant.lastName ?? ""}`.trim()
                    : "—",
              },
              {
                key: "landlord",
                header: "Landlord",
                render: (r) =>
                  r.landlord
                    ? `${r.landlord.firstName ?? ""} ${r.landlord.lastName ?? ""}`.trim()
                    : "—",
              },
              {
                key: "rentAmount",
                header: "Rent",
                render: (r) => (
                  <span className="font-medium text-foundation-700">
                    {formatNgn(r.rentAmount)}{" "}
                    <span className="text-xs font-normal text-ink-muted">/{r.paymentFrequency}</span>
                  </span>
                ),
              },
              {
                key: "term",
                header: "Term",
                render: (r) => (
                  <span className="text-xs text-ink-muted">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </span>
                ),
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
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

      <LeaseDetailDrawer
        leaseId={selectedLeaseId}
        onClose={() => setSelectedLeaseId(null)}
      />
    </>
  );
}
