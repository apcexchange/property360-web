"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, Receipt } from "@/lib/landlord-api";

export default function ReceiptsPage() {
  const q = useQuery({
    queryKey: ["receipts"],
    queryFn: () => landlordApi.listReceipts(),
  });

  return (
    <>
      <AppTopbar
        title="Receipts"
        subtitle="Issued automatically when a payment clears"
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No receipts yet"
            body="Receipts are generated and emailed automatically when a payment is recorded, manual or Paystack."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((r) => (
              <ReceiptRow key={r._id} r={r} />
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}

function ReceiptRow({ r }: { r: Receipt }) {
  const tenant =
    typeof r.tenant === "object"
      ? `${r.tenant.firstName} ${r.tenant.lastName}`
      : "Tenant";
  const property = typeof r.property === "object" ? r.property.name : "";
  const unit = typeof r.unit === "object" ? `Unit ${r.unit.unitNumber}` : "";
  return (
    <Link
      href={`/app/receipts/${r._id}`}
      className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-foundation-700/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12.5px] text-ink-muted">
            #{r.receiptNumber}
          </p>
          {r.emailedAt && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Emailed
            </span>
          )}
        </div>
        <p className="mt-1 text-[14px] font-semibold text-foundation-700">
          {tenant}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {property} {unit && `· ${unit}`} · {formatDate(r.paymentDate)} ·{" "}
          {r.description}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[14px] font-semibold text-foundation-700">
          {formatNgn(r.amount)}
        </p>
      </div>
    </Link>
  );
}
