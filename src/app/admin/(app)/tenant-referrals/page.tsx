"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import adminApi, { AdminTenantReferralRow } from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

function ReferralStatusLabel({ status }: { status: AdminTenantReferralRow["status"] }) {
  if (status === "reversed") {
    return (
      <span className="inline-flex items-center rounded-full bg-foundation-700/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Reversed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
      {status === "accrued" ? "Credited" : "Paid out"}
    </span>
  );
}

function NeedsReviewLabel() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-red-700">
      Needs review
    </span>
  );
}

export default function AdminTenantReferralsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tenant-referrals", { page }],
    queryFn: () => adminApi.listTenantReferrals({ page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Tenant referrals"
            description="Rewards paid to tenants whose landlord or caretaker joined and paid. Rows needing review were refunded after the tenant withdrew."
          />
          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No tenant referral rewards yet"
            columns={[
              { key: "createdAt", header: "Date", render: (r) => formatDate(r.createdAt) },
              {
                key: "owner",
                header: "Tenant",
                render: (r) => (r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : "Deleted user"),
              },
              {
                key: "referee",
                header: "Joined",
                render: (r) =>
                  r.referee ? `${r.referee.firstName} ${r.referee.lastName} (${r.referee.role})` : "Deleted user",
              },
              { key: "basisAmount", header: "Subscription", render: (r) => formatNgn(r.basisAmount) },
              { key: "commissionAmount", header: "Reward", render: (r) => formatNgn(r.commissionAmount) },
              {
                key: "status",
                header: "Status",
                render: (r) => (r.needsReview ? <NeedsReviewLabel /> : <ReferralStatusLabel status={r.status} />),
              },
            ]}
          />
          <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 50} onChange={setPage} />
        </div>
      </main>
    </>
  );
}
