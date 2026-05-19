"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Select } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminReservationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reservations", { page, status }],
    queryFn: () =>
      adminApi.listReservations({ page, limit, status: status || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Reservation requests"
            description="Tenants reserving listed units. Pending requests await landlord approval."
            filters={
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No reservations match this filter"
            columns={[
              {
                key: "createdAt",
                header: "Submitted",
                render: (r) => formatDate(r.createdAt),
              },
              {
                key: "tenant",
                header: "Tenant",
                render: (r) => (
                  <div>
                    <p className="font-medium text-foundation-700">
                      {r.tenant
                        ? `${r.tenant.firstName ?? ""} ${r.tenant.lastName ?? ""}`.trim()
                        : "—"}
                    </p>
                    {r.tenant?.email && (
                      <p className="text-xs text-ink-muted">{r.tenant.email}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "property",
                header: "Listing",
                render: (r) => (
                  <div>
                    <p className="text-foundation-700">{r.property?.name ?? "—"}</p>
                    {r.unit?.unitNumber && (
                      <p className="text-xs text-ink-muted">
                        Unit {r.unit.unitNumber}
                        {r.unit.rentAmount ? ` · ${formatNgn(r.unit.rentAmount)}` : ""}
                      </p>
                    )}
                  </div>
                ),
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
                key: "payment",
                header: "Payment",
                render: (r) =>
                  r.paymentAmount ? (
                    <div>
                      <p className="text-foundation-700">{formatNgn(r.paymentAmount)}</p>
                      {r.paymentType && (
                        <p className="text-xs capitalize text-ink-muted">{r.paymentType}</p>
                      )}
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "expiresAt",
                header: "Expires",
                render: (r) =>
                  r.expiresAt ? (
                    <span className="text-xs text-ink-muted">{formatDate(r.expiresAt)}</span>
                  ) : (
                    "—"
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
    </>
  );
}
