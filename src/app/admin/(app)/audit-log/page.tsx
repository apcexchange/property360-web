"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Select } from "@/components/admin/ui/Filters";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  "kyc.approve": "Approved KYC",
  "kyc.reject": "Rejected KYC",
  "user.suspend": "Suspended user",
  "user.activate": "Activated user",
};

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "user.suspend", label: "Suspend user" },
  { value: "user.activate", label: "Activate user" },
  { value: "kyc.approve", label: "Approve KYC" },
  { value: "kyc.reject", label: "Reject KYC" },
];

function formatTimestamp(raw: string): string {
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", { page, action }],
    queryFn: () =>
      adminApi.listAuditLog({
        page,
        limit,
        action: action || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Admin audit log"
            description="Every mutating action taken by an admin. Used for compliance and incident review."
            filters={
              <Select value={action} onChange={(v) => { setAction(v); setPage(1); }}>
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            }
          />

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No audit entries"
            emptyDescription="Admin actions taken in this dashboard appear here."
            columns={[
              {
                key: "createdAt",
                header: "When",
                render: (r) => formatDate(r.createdAt),
                className: "whitespace-nowrap",
              },
              {
                key: "actor",
                header: "Admin",
                render: (r) => {
                  const name = r.actor
                    ? `${r.actor.firstName ?? ""} ${r.actor.lastName ?? ""}`.trim()
                    : "";
                  return (
                    <div>
                      <p className="font-medium text-foundation-700">{name || "—"}</p>
                      <p className="text-xs text-ink-muted">
                        {r.actor?.email ?? r.actorEmail ?? ""}
                      </p>
                    </div>
                  );
                },
              },
              {
                key: "action",
                header: "Action",
                render: (r) => (
                  <span className="font-mono text-xs text-foundation-700">
                    {ACTION_LABELS[r.action] ?? r.action}
                  </span>
                ),
              },
              {
                key: "target",
                header: "Target",
                render: (r) => {
                  const meta = r.metadata ?? {};
                  const email = typeof meta.email === "string" ? meta.email : undefined;
                  const reason = typeof meta.reason === "string" ? meta.reason : undefined;
                  return (
                    <div className="min-w-0">
                      <p className="truncate text-foundation-700">
                        {email ?? r.targetType ?? "—"}
                      </p>
                      {reason && (
                        <p className="line-clamp-2 text-xs italic text-ink-muted">
                          &ldquo;{reason}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "timestamp",
                header: "Timestamp",
                render: (r) => (
                  <span className="text-xs text-ink-muted">{formatTimestamp(r.createdAt)}</span>
                ),
                className: "whitespace-nowrap",
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
