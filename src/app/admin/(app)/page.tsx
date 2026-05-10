"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ["admin", "transactions", { page: 1, limit: 5 }],
    queryFn: () => adminApi.listTransactions({ page: 1, limit: 5 }),
  });

  const cards = [
    { label: "Active landlords", value: stats?.landlordCount },
    { label: "Active tenants", value: stats?.tenantCount },
    { label: "Properties listed", value: stats?.propertyCount },
    { label: "Rent collected (30d)", value: stats ? formatNgn(stats.rentCollected30d) : undefined },
  ];

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl font-semibold text-foundation-700">Overview</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Live figures from the production API.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-border bg-surface p-5 shadow-card"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {c.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foundation-700">
                  {statsLoading || c.value === undefined ? (
                    <span className="inline-block h-7 w-24 animate-pulse rounded bg-canvas" />
                  ) : (
                    String(c.value)
                  )}
                </p>
              </div>
            ))}
          </div>

          {stats && stats.pendingKycCount > 0 && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm text-amber-800">
                <strong>{stats.pendingKycCount}</strong> KYC submission
                {stats.pendingKycCount === 1 ? "" : "s"} awaiting review.
              </p>
              <a
                href="/admin/kyc"
                className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200"
              >
                Review now
              </a>
            </div>
          )}

          <div className="mt-10">
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-base font-semibold text-foundation-700">Recent transactions</h3>
              <a
                href="/admin/transactions"
                className="text-xs font-medium text-foundation-700 hover:text-foundation-900"
              >
                View all →
              </a>
            </div>
            <DataTable
              loading={recentLoading}
              rows={recent?.items ?? []}
              columns={[
                { key: "paymentDate", header: "Date", render: (r) => formatDate(r.paymentDate ?? r.createdAt) },
                {
                  key: "tenant",
                  header: "Tenant",
                  render: (r) =>
                    r.tenant ? `${r.tenant.firstName ?? ""} ${r.tenant.lastName ?? ""}`.trim() : "—",
                },
                {
                  key: "property",
                  header: "Property",
                  render: (r) => r.lease?.property?.name ?? "—",
                },
                { key: "type", header: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
                {
                  key: "amount",
                  header: "Amount",
                  render: (r) => <span className="font-medium text-foundation-700">{formatNgn(r.amount)}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge value={r.status} />,
                },
              ]}
            />
          </div>
        </div>
      </main>
    </>
  );
}
