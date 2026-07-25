"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import adminApi, { AdminPartnerDetail } from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";

type CommissionRow = AdminPartnerDetail["commissions"][number];

export default function AdminPartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners", id],
    queryFn: () => adminApi.getPartnerDetail(id),
  });

  return (
    <>
      <Topbar trail={data?.code.code} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {isLoading || !data ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <>
              <PageHeader
                title={data.code.code}
                description={`${data.code.owner.firstName} ${data.code.owner.lastName} (${data.code.owner.email}) · ${data.code.commissionRate}% commission`}
                actions={<StatusBadge value={data.code.status} />}
              />

              <DataTable<CommissionRow>
                rows={data.commissions}
                empty="No conversions yet"
                emptyDescription="Commission rows appear here once a referred user completes their first paid subscription."
                columns={[
                  {
                    key: "referee",
                    header: "Referred user",
                    render: (r) =>
                      r.referee ? `${r.referee.firstName} ${r.referee.lastName}` : "Deleted user",
                  },
                  {
                    key: "basisAmount",
                    header: "First payment",
                    render: (r) => formatNgn(r.basisAmount),
                  },
                  { key: "rate", header: "Rate", render: (r) => `${r.rate}%` },
                  {
                    key: "commissionAmount",
                    header: "Commission",
                    render: (r) => formatNgn(r.commissionAmount),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => <StatusBadge value={r.status} />,
                  },
                  {
                    key: "createdAt",
                    header: "Date",
                    render: (r) => formatDate(r.createdAt),
                  },
                ]}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
