"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Select, Button } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminPayoutsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payouts", { page, status }],
    queryFn: () =>
      adminApi.listPayouts({ page, limit, status: status || undefined }),
    placeholderData: keepPreviousData,
  });

  const onExport = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await adminApi.downloadCsv(
        "/admin/payouts/export",
        `payouts-${stamp}.csv`,
        { status: status || undefined }
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
            title="Landlord payouts"
            description="Withdrawals processed via Paystack Transfer to landlord bank accounts."
            actions={
              <Button onClick={onExport} disabled={exporting} size="sm">
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            }
            filters={
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </Select>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No payouts in this view"
            columns={[
              {
                key: "requestedAt",
                header: "Requested",
                render: (r) => formatDate(r.requestedAt),
              },
              {
                key: "landlord",
                header: "Landlord",
                render: (r) =>
                  r.landlord ? (
                    <div>
                      <p className="font-medium text-foundation-700">
                        {`${r.landlord.firstName ?? ""} ${r.landlord.lastName ?? ""}`.trim()}
                      </p>
                      <p className="text-xs text-ink-muted">{r.landlord.email}</p>
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "bank",
                header: "Bank",
                render: (r) =>
                  r.bankAccount ? (
                    <div>
                      <p className="text-foundation-700">{r.bankAccount.bankName ?? "—"}</p>
                      <p className="text-xs text-ink-muted">
                        {r.bankAccount.accountNumber} · {r.bankAccount.accountName}
                      </p>
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "amount",
                header: "Net amount",
                render: (r) => (
                  <div>
                    <p className="font-medium text-foundation-700">{formatNgn(r.netAmount)}</p>
                    {r.fee > 0 && (
                      <p className="text-xs text-ink-muted">fee {formatNgn(r.fee)}</p>
                    )}
                  </div>
                ),
              },
              { key: "reference", header: "Reference", render: (r) => (
                <span className="font-mono text-xs text-ink-muted">{r.reference}</span>
              )},
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
