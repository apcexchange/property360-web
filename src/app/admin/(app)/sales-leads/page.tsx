"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Select, Button } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi, { AdminSalesLeadRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";

/** wa.me link from a Nigerian phone in 080… / +234… / 234… form. */
function waLink(phone: string, name?: string | null): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "234" + digits.slice(1);
  const text = encodeURIComponent(
    `Hi ${name?.split(" ")[0] ?? "there"}, following up on your chat with the Property360 assistant. How can I help you get set up?`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export default function AdminSalesLeadsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("captured");
  const [quality, setQuality] = useState("all");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sales-leads", { status, quality, page }],
    queryFn: () => adminApi.listSalesLeads({ status, quality, page, limit }),
  });

  const detail = useQuery({
    queryKey: ["admin", "sales-lead", viewingId],
    queryFn: () => adminApi.getSalesLead(viewingId as string),
    enabled: viewingId !== null,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateSalesLead(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sales-leads"] });
      qc.invalidateQueries({ queryKey: ["admin", "sales-lead", viewingId] });
    },
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Sales leads"
            description="Visitors captured by the website sales assistant."
            filters={
              <>
                <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }}>
                  <option value="captured">Captured</option>
                  <option value="open">Open (no contact yet)</option>
                  <option value="converted">Converted</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="all">All</option>
                </Select>
                <Select value={quality} onChange={(v) => { setQuality(v); setPage(1); }}>
                  <option value="all">Any quality</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </Select>
              </>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No leads yet"
            emptyDescription="Conversations from the website chat will show up here."
            columns={[
              {
                key: "lead",
                header: "Lead",
                render: (r: AdminSalesLeadRow) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {r.name || "Anonymous visitor"}
                    </div>
                    {r.phone && <div className="text-xs text-ink-muted">{r.phone}</div>}
                    {r.email && <div className="text-xs text-ink-muted">{r.email}</div>}
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (r) => (
                  <div>
                    <div className="text-sm capitalize text-foundation-700">{r.role ?? "?"}</div>
                    {r.portfolioSize && (
                      <div className="text-xs text-ink-muted">{r.portfolioSize}</div>
                    )}
                  </div>
                ),
              },
              { key: "quality", header: "Quality", render: (r) => <StatusBadge value={r.quality ?? "unrated"} /> },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "messages", header: "Msgs", render: (r) => r.messageCount },
              {
                key: "last",
                header: "Last activity",
                render: (r) => formatDate(r.lastMessageAt ?? r.createdAt),
              },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-1.5">
                    {r.phone && (
                      <a
                        href={waLink(r.phone, r.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foundation-700 hover:bg-canvas"
                      >
                        WhatsApp
                      </a>
                    )}
                    <Button size="sm" onClick={() => setViewingId(r._id)}>
                      View
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          <Pagination page={page} total={data?.total ?? 0} limit={limit} onChange={setPage} />
        </div>
      </main>

      {viewingId && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foundation-900/50 px-6">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface p-6 shadow-pop">
            {detail.isLoading || !detail.data ? (
              <p className="text-sm text-ink-muted">Loading transcript…</p>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foundation-700">
                      {detail.data.lead.name || "Anonymous visitor"}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {[detail.data.lead.phone, detail.data.lead.email, detail.data.lead.role]
                        .filter(Boolean)
                        .join(" · ") || "No contact details yet"}
                    </p>
                  </div>
                  <StatusBadge value={detail.data.lead.status} />
                </div>

                <div className="mt-4 flex-1 space-y-2 overflow-y-auto rounded-lg border border-border bg-canvas p-3">
                  {detail.data.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] ${
                          m.role === "user"
                            ? "bg-foundation-700 text-cryola-50"
                            : "border border-border bg-surface text-foundation-700"
                        }`}
                      >
                        {m.content}
                        <p className="mt-1 text-[10px] opacity-60">{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {detail.data.lead.phone && (
                      <a
                        href={waLink(detail.data.lead.phone, detail.data.lead.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-foundation-700 px-3 py-2 text-xs font-semibold text-cryola-50 hover:bg-foundation-800"
                      >
                        Follow up on WhatsApp
                      </a>
                    )}
                    <button
                      disabled={update.isPending || detail.data.lead.status === "converted"}
                      onClick={() => update.mutate({ id: detail.data.lead._id, status: "converted" })}
                      className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas disabled:opacity-50"
                    >
                      Mark converted
                    </button>
                    <button
                      disabled={update.isPending || detail.data.lead.status === "dismissed"}
                      onClick={() => update.mutate({ id: detail.data.lead._id, status: "dismissed" })}
                      className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                  <button
                    onClick={() => setViewingId(null)}
                    className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foundation-700 hover:bg-canvas"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
