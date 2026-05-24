"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Landmark } from "lucide-react";
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

export default function WalletPage() {
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => landlordApi.wallet(),
  });
  const tx = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: () => landlordApi.walletTransactions(),
  });

  return (
    <>
      <AppTopbar
        title="Wallet"
        subtitle="Rent collected via Paystack lands here"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/app/wallet/bank-accounts"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <Landmark className="h-4 w-4" /> Bank accounts
            </Link>
            <Link
              href="/app/wallet/withdraw"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              <ArrowDownToLine className="h-4 w-4" /> Withdraw
            </Link>
          </div>
        }
      />
      <PageContainer>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wallet.isLoading || !wallet.data ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
              </Card>
            ))
          ) : (
            <>
              <Card className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Available balance
                </p>
                <p className="mt-3 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                  {formatNgn(wallet.data.balance)}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Pending
                </p>
                <p className="mt-3 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                  {formatNgn(wallet.data.pendingBalance)}
                </p>
                <p className="mt-2 text-[11.5px] text-ink-muted">
                  Clears once Paystack settles
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Total earned
                </p>
                <p className="mt-3 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                  {formatNgn(wallet.data.totalEarned)}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Paid out
                </p>
                <p className="mt-3 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                  {formatNgn(wallet.data.totalPaidOut)}
                </p>
              </Card>
            </>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Recent transactions
          </h2>
          {tx.isLoading ? (
            <Card className="divide-y divide-foundation-700/10">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </Card>
          ) : tx.isError ? (
            <ErrorBox
              message={(tx.error as Error)?.message}
              onRetry={() => tx.refetch()}
            />
          ) : (tx.data ?? []).length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-ink-muted">
              No transactions yet.
            </Card>
          ) : (
            <Card className="divide-y divide-foundation-700/10">
              {tx.data!.map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-foundation-700">
                      {t.description}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {formatDate(t.createdAt)}
                      {t.reference && ` · ${t.reference}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[14px] font-semibold ${
                        t.type === "credit"
                          ? "text-emerald-700"
                          : "text-foundation-700"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "−"}
                      {formatNgn(t.amount)}
                    </p>
                    <StatusPill
                      label={t.status}
                      tone={
                        t.status === "completed"
                          ? "good"
                          : t.status === "pending"
                          ? "warn"
                          : "bad"
                      }
                    />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
