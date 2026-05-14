"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi, { AdminReportRow, ReportAction } from "@/lib/admin";
import { formatDate } from "@/lib/format";

const ACTION_LABELS: Record<ReportAction, string> = {
  message_deleted: "Delete the message",
  user_warned: "Warn the user",
  user_suspended: "Suspend the user",
  dismissed: "Dismiss the report",
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  sexual_content: "Sexual content",
  violence: "Threats / violence",
  misinformation: "Misinformation",
  other: "Other",
};

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [reviewing, setReviewing] = useState<AdminReportRow | null>(null);
  const [selectedAction, setSelectedAction] = useState<ReportAction>("message_deleted");
  const [note, setNote] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", { status, page }],
    queryFn: () => adminApi.listReports({ status, page, limit }),
  });

  const resolve = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: ReportAction; note?: string }) =>
      adminApi.resolveReport(id, action, note),
    onSuccess: () => {
      setReviewing(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Topbar title="Moderation reports" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foundation-700">User reports</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Review messages flagged by tenants in the building chat.
              </p>
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foundation-700"
            >
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </select>
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No reports."
            columns={[
              {
                key: "createdAt",
                header: "Reported",
                render: (r) => formatDate(r.createdAt),
              },
              {
                key: "reportedUser",
                header: "Reported user",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {r.reportedUser
                        ? `${r.reportedUser.firstName ?? ""} ${r.reportedUser.lastName ?? ""}`.trim()
                        : "—"}
                    </div>
                    {r.reportedUser?.email && (
                      <div className="text-xs text-ink-muted">{r.reportedUser.email}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "snapshot",
                header: "Message",
                render: (r) => (
                  <div className="max-w-md">
                    <p className="line-clamp-2 text-sm italic text-foundation-700">
                      &ldquo;{r.messageSnapshot ?? "—"}&rdquo;
                    </p>
                    {r.building?.name && (
                      <p className="mt-1 text-xs text-ink-muted">in {r.building.name}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "reason",
                header: "Reason",
                render: (r) => REASON_LABELS[r.reason] ?? r.reason,
              },
              {
                key: "reporter",
                header: "Reported by",
                render: (r) =>
                  r.reporter
                    ? `${r.reporter.firstName ?? ""} ${r.reporter.lastName ?? ""}`.trim()
                    : "—",
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) =>
                  r.status === "pending" ? (
                    <button
                      onClick={() => {
                        setReviewing(r);
                        setSelectedAction("message_deleted");
                        setNote("");
                      }}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foundation-700 hover:bg-canvas"
                    >
                      Review
                    </button>
                  ) : r.reviewAction ? (
                    <span className="text-xs text-ink-muted">{ACTION_LABELS[r.reviewAction]}</span>
                  ) : null,
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

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foundation-900/50 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-pop">
            <h3 className="text-lg font-semibold text-foundation-700">Review report</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Reported by{" "}
              <strong>
                {reviewing.reporter
                  ? `${reviewing.reporter.firstName ?? ""} ${reviewing.reporter.lastName ?? ""}`.trim()
                  : "Unknown"}
              </strong>{" "}
              for <strong>{REASON_LABELS[reviewing.reason] ?? reviewing.reason}</strong>.
            </p>

            <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-ink-muted">
                Message from{" "}
                {reviewing.reportedUser
                  ? `${reviewing.reportedUser.firstName} ${reviewing.reportedUser.lastName}`
                  : "user"}
              </p>
              <p className="mt-1 text-sm italic text-foundation-700">
                &ldquo;{reviewing.messageSnapshot}&rdquo;
              </p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Action
              </p>
              <div className="mt-2 space-y-2">
                {(Object.keys(ACTION_LABELS) as ReportAction[]).map((action) => (
                  <label
                    key={action}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                      selectedAction === action
                        ? "border-foundation-700 bg-canvas"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedAction === action}
                      onChange={() => setSelectedAction(action)}
                      className="accent-foundation-700"
                    />
                    <span className="text-sm text-foundation-700">{ACTION_LABELS[action]}</span>
                  </label>
                ))}
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (visible to other admins)…"
              rows={2}
              className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setReviewing(null);
                  setNote("");
                }}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                disabled={resolve.isPending}
                onClick={() =>
                  resolve.mutate({ id: reviewing._id, action: selectedAction, note: note || undefined })
                }
                className="rounded-md bg-foundation-700 px-3 py-2 text-xs font-semibold text-cryola-50 hover:bg-foundation-800 disabled:opacity-50"
              >
                {resolve.isPending ? "Applying…" : "Apply action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
