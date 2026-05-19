"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Select, Button } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [exporting, setExporting] = useState(false);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transactions", { page, status, type }],
    queryFn: () =>
      adminApi.listTransactions({
        page,
        limit,
        status: status || undefined,
        type: type || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const onExport = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await adminApi.downloadCsv(
        "/admin/transactions/export",
        `transactions-${stamp}.csv`,
        { status: status || undefined, type: type || undefined }
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="All transactions"
            description="Rent, deposits, and other platform-side movements."
            actions={
              <Button onClick={onExport} disabled={exporting} size="sm">
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            }
            filters={
              <>
                <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="voided">Voided</option>
                </Select>
                <Select value={type} onChange={(v) => { setType(v); setPage(1); }}>
                  <option value="">All types</option>
                  <option value="rent">Rent</option>
                  <option value="deposit">Deposit</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
              </>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No transactions match these filters"
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
