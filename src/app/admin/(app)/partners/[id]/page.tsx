"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Button } from "@/components/admin/ui/Filters";
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

              <PartnerControls detail={data} />

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

function PartnerControls({ detail }: { detail: AdminPartnerDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [rate, setRate] = useState<number>(detail.code.commissionRate);

  const rateMut = useMutation({
    mutationFn: () => adminApi.updatePartnerRate(detail.code._id, rate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partners", detail.code._id] });
      qc.invalidateQueries({ queryKey: ["admin", "partners"] });
    },
  });

  const del = useMutation({
    mutationFn: () => adminApi.deletePartner(detail.code._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "partners"] });
      router.replace("/admin/partners");
    },
  });

  const count = detail.commissions.length;
  const totalEarned = detail.commissions.reduce(
    (s, c) => s + (c.commissionAmount ?? 0),
    0
  );

  const confirmDelete = () => {
    const history = count
      ? ` It has ${count} paid conversion(s) totalling ${formatNgn(
          totalEarned
        )} of commission history, which will be permanently deleted.`
      : "";
    if (
      window.confirm(
        `Delete partner code "${detail.code.code}"?${history} Money already paid into the partner's wallet is NOT refunded. This cannot be undone.`
      )
    ) {
      del.mutate();
    }
  };

  const rateChanged = rate !== detail.code.commissionRate;
  const rateValid = Number.isFinite(rate) && rate >= 0 && rate <= 100;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[13px] font-medium text-ink-body">
          Commission rate
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
        />
        <span className="text-sm text-ink-muted">%</span>
        <Button
          variant="primary"
          size="sm"
          disabled={rateMut.isPending || !rateChanged || !rateValid}
          onClick={() => rateMut.mutate()}
        >
          {rateMut.isPending ? "Saving…" : "Save rate"}
        </Button>
        {rateMut.isSuccess && !rateChanged && (
          <span className="text-sm text-success">Saved</span>
        )}
        {rateMut.isError && (
          <span className="text-sm text-error">Couldn&apos;t save</span>
        )}
      </div>
      <Button
        variant="danger"
        size="sm"
        disabled={del.isPending}
        onClick={confirmDelete}
      >
        {del.isPending ? "Deleting…" : "Delete partner"}
      </Button>
    </div>
  );
}
