"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Button } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi, { AdminKycRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default function AdminKycPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectFor, setRejectFor] = useState<AdminKycRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc", "pending", { page }],
    queryFn: () => adminApi.listPendingKyc({ page, limit }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveKyc(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectKyc(id, reason),
    onSuccess: () => {
      setRejectFor(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Pending KYC submissions"
            description="Approve or reject identity documents submitted by users."
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No pending submissions"
            emptyDescription="All submissions have been reviewed. New ones will appear here automatically."
            columns={[
              {
                key: "user",
                header: "User",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {`${r.firstName} ${r.lastName}`.trim()}
                    </div>
                    <div className="text-xs text-ink-muted">{r.email}</div>
                  </div>
                ),
              },
              { key: "role", header: "Role", render: (r) => <span className="capitalize">{r.role}</span> },
              {
                key: "docType",
                header: "Document",
                render: (r) => r.kyc?.document?.type ?? "—",
              },
              {
                key: "submitted",
                header: "Submitted",
                render: (r) => formatDate(r.kyc?.document?.uploadedAt),
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.kyc?.status} /> },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    {r.kyc?.document?.imageUrl && (
                      <a
                        href={r.kyc.document.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foundation-700 hover:bg-canvas"
                      >
                        View doc
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="success"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(r._id)}
                    >
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRejectFor(r)}>
                      Reject
                    </Button>
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

      {rejectFor && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foundation-900/50 px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-pop">
            <h3 className="text-lg font-semibold text-foundation-700">
              Reject KYC for {`${rejectFor.firstName} ${rejectFor.lastName}`.trim()}?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Tell the user what was wrong so they can re-submit.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Document image is blurry."
              rows={3}
              className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectFor(null);
                  setRejectReason("");
                }}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                disabled={reject.isPending}
                onClick={() => reject.mutate({ id: rejectFor._id, reason: rejectReason })}
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reject.isPending ? "Rejecting…" : "Reject submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
