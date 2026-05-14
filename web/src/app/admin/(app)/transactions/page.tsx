"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transactions", { page }],
    queryFn: () => adminApi.listTransactions({ page, limit }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Topbar title="Transactions" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foundation-700">All transactions</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Rent, deposits, and platform-side movements.
            </p>
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            columns={[
              {
                key: "paymentDate",
                header: "Date",
                render: (r) => formatDate(r.paymentDate ?? r.createdAt),
              },
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
              { key: "paymentMethod", header: "Method", render: (r) => r.paymentMethod ?? "—" },
              {
                key: "amount",
                header: "Amount",
                render: (r) => (
                  <span className="font-medium text-foundation-700">{formatNgn(r.amount)}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => <StatusBadge value={r.status} />,
              },
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
