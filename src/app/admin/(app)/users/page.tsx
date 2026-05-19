"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { SearchInput, Select } from "@/components/admin/ui/Filters";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import adminApi, { AdminUserRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="All users"
            description="Landlords, tenants, and agents on Property360."
            filters={
              <>
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search name, email, phone…"
                  className="w-full sm:w-80"
                />
                <Select
                  value={role}
                  onChange={(v) => {
                    setRole(v);
                    setPage(1);
                  }}
                >
                  <option value="">All roles</option>
                  <option value="landlord">Landlord</option>
                  <option value="tenant">Tenant</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </Select>
              </>
            }
          />

          <DataTable<AdminUserRow>
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No users found"
            emptyDescription="Try a different search term or change the role filter."
            onRowClick={(r) => setSelectedUserId(r._id)}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—"}
                    </div>
                    <div className="text-xs text-ink-muted">{r.email}</div>
                  </div>
                ),
              },
              { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
              {
                key: "role",
                header: "Role",
                render: (r) => <span className="capitalize text-foundation-500">{r.role}</span>,
              },
              { key: "kyc", header: "KYC", render: (r) => <StatusBadge value={r.kyc?.status} /> },
              {
                key: "isActive",
                header: "Account",
                render: (r) =>
                  r.isActive ? <StatusBadge value="active" /> : <StatusBadge value="dismissed" />,
              },
              { key: "createdAt", header: "Joined", render: (r) => formatDate(r.createdAt) },
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

      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
}
