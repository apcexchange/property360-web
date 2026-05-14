"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi, { AdminDeletionRequestRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default function AdminDeletionRequestsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [reviewing, setReviewing] = useState<AdminDeletionRequestRow | null>(null);
  const [action, setAction] = useState<"completed" | "rejected">("completed");
  const [notes, setNotes] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "deletion-requests", { status, page }],
    queryFn: () => adminApi.listDeletionRequests({ status, page, limit }),
  });

  const resolve = useMutation({
    mutationFn: ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: "completed" | "rejected";
      notes?: string;
    }) => adminApi.resolveDeletionRequest(id, action, notes),
    onSuccess: () => {
      setReviewing(null);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "deletion-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Topbar title="Account deletion requests" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foundation-700">Pending deletions</h2>
              <p className="mt-1 text-sm text-ink-muted">
                NDPA requires us to action these within 30 days.
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
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No deletion requests."
            columns={[
              {
                key: "createdAt",
                header: "Submitted",
                render: (r) => formatDate(r.createdAt),
              },
              {
                key: "email",
                header: "Email",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">{r.email}</div>
                    {r.phone && <div className="text-xs text-ink-muted">{r.phone}</div>}
                  </div>
                ),
              },
              {
                key: "linked",
                header: "Account match",
                render: (r) =>
                  r.user ? (
                    <div>
                      <div className="text-sm text-foundation-700">
                        {`${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim()}
                      </div>
                      <div className="text-xs text-ink-muted capitalize">{r.user.role ?? "—"}</div>
                    </div>
                  ) : (
                    <span className="text-xs italic text-ink-muted">No matching account</span>
                  ),
              },
              {
                key: "reason",
                header: "Reason",
                render: (r) => (
                  <p className="line-clamp-2 max-w-xs text-sm text-ink-muted">
                    {r.reason || "—"}
                  </p>
                ),
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) =>
                  r.status === "pending" || r.status === "verified" ? (
                    <button
                      onClick={() => {
                        setReviewing(r);
                        setAction(r.user ? "completed" : "rejected");
                        setNotes("");
                      }}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foundation-700 hover:bg-canvas"
                    >
                      Review
                    </button>
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

      {reviewing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foundation-900/50 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-pop">
            <h3 className="text-lg font-semibold text-foundation-700">
              Review deletion request
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              From <strong>{reviewing.email}</strong>
              {reviewing.phone && ` (${reviewing.phone})`}
            </p>

            {reviewing.user ? (
              <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-ink-muted">Matched account</p>
                <p className="mt-1 text-sm text-foundation-700">
                  {`${reviewing.user.firstName ?? ""} ${reviewing.user.lastName ?? ""}`.trim()}
                  {" · "}
                  <span className="capitalize">{reviewing.user.role}</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Choosing &ldquo;Complete&rdquo; will anonymise this user&apos;s personal
                  identifiers (name, email, phone, avatar, NIN) and set
                  isActive=false. Lease + payment records remain for the counterparty.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-900">
                  No active account matched <strong>{reviewing.email}</strong>. You can still
                  mark this request as resolved with a note explaining the outcome (e.g.
                  &ldquo;already deleted&rdquo; or &ldquo;no record&rdquo;).
                </p>
              </div>
            )}

            {reviewing.reason && (
              <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-ink-muted">User&apos;s reason</p>
                <p className="mt-1 text-sm italic text-foundation-700">
                  &ldquo;{reviewing.reason}&rdquo;
                </p>
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Action</p>
              <div className="mt-2 space-y-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${action === "completed" ? "border-foundation-700 bg-canvas" : "border-border"}`}>
                  <input
                    type="radio"
                    checked={action === "completed"}
                    onChange={() => setAction("completed")}
                    disabled={!reviewing.user}
                    className="accent-foundation-700"
                  />
                  <span className="text-sm text-foundation-700">
                    Complete — anonymise the matched account
                  </span>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${action === "rejected" ? "border-foundation-700 bg-canvas" : "border-border"}`}>
                  <input
                    type="radio"
                    checked={action === "rejected"}
                    onChange={() => setAction("rejected")}
                    className="accent-foundation-700"
                  />
                  <span className="text-sm text-foundation-700">
                    Reject — no action taken
                  </span>
                </label>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal note (visible to other admins)…"
              rows={2}
              className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setReviewing(null);
                  setNotes("");
                }}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                disabled={resolve.isPending}
                onClick={() =>
                  resolve.mutate({
                    id: reviewing._id,
                    action,
                    notes: notes || undefined,
                  })
                }
                className="rounded-md bg-foundation-700 px-3 py-2 text-xs font-semibold text-cryola-50 hover:bg-foundation-800 disabled:opacity-50"
              >
                {resolve.isPending ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
