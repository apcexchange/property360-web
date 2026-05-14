"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", { page, search, role }],
    queryFn: () =>
      adminApi.listUsers({
        page,
        limit,
        search: search || undefined,
        role: role || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Topbar title="Users" />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foundation-700">All users</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Landlords, tenants, and agents on Property360.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, phone…"
                className="w-64 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
              />
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foundation-700"
              >
                <option value="">All roles</option>
                <option value="landlord">Landlord</option>
                <option value="tenant">Tenant</option>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (r) => (
                  <span className="font-medium text-foundation-700">
                    {`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—"}
                  </span>
                ),
              },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "role", header: "Role", render: (r) => <span className="capitalize">{r.role}</span> },
              { key: "kyc", header: "KYC", render: (r) => <StatusBadge value={r.kyc?.status} /> },
              { key: "createdAt", header: "Joined", render: (r) => formatDate(r.createdAt) },
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
