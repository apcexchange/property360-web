"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

export default function SharedBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["shared-bill", id],
    queryFn: () => landlordApi.getSharedBill(id),
    enabled: !!id,
  });

  const bill = q.data;

  return (
    <>
      <AppTopbar
        title={bill?.title ?? "Shared bill"}
        actions={
          <Link
            href="/app/community"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </Card>
        ) : q.isError || !bill ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Bill not found."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Total
                  </p>
                  <p className="mt-2 font-display text-[28px] font-extrabold text-foundation-700">
                    {formatNgn(bill.totalAmount)}
                  </p>
                </div>
                <StatusPill
                  label={bill.status}
                  tone={
                    bill.status === "settled"
                      ? "good"
                      : bill.status === "closed"
                      ? "neutral"
                      : "info"
                  }
                />
              </div>
              {bill.description && (
                <p className="mt-4 whitespace-pre-wrap text-[13.5px] text-foundation-700">
                  {bill.description}
                </p>
              )}
              <p className="mt-3 text-[11.5px] text-ink-muted">
                Raised by{" "}
                {typeof bill.createdBy === "object"
                  ? `${bill.createdBy.firstName} ${bill.createdBy.lastName}`
                  : "tenant"}{" "}
                · {formatDate(bill.createdAt)}
              </p>
            </Card>

            <Card className="mt-6">
              <div className="border-b border-foundation-700/10 px-5 py-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Shares ({bill.shares?.length ?? 0})
                </h2>
              </div>
              {!bill.shares || bill.shares.length === 0 ? (
                <p className="p-5 text-[13px] text-ink-muted">
                  Shares not yet allocated.
                </p>
              ) : (
                <ul className="divide-y divide-foundation-700/10">
                  {bill.shares.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <p className="text-[13.5px] font-semibold text-foundation-700">
                          {typeof s.user === "object"
                            ? `${s.user.firstName} ${s.user.lastName}`
                            : "Tenant"}
                        </p>
                        {s.paid && s.paidAt && (
                          <p className="mt-0.5 text-[11.5px] text-ink-muted">
                            Paid {formatDate(s.paidAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[13.5px] font-semibold text-foundation-700">
                          {formatNgn(s.amount)}
                        </p>
                        <StatusPill
                          label={s.paid ? "Paid" : "Pending"}
                          tone={s.paid ? "good" : "warn"}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <p className="mt-4 text-center text-[11px] text-ink-muted">
              Read-only — only tenants of this building can create or settle
              shared bills.
            </p>
          </>
        )}
      </PageContainer>
    </>
  );
}
