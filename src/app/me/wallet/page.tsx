"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Landmark } from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import { tenantApi } from "@/lib/tenant-api";
import {
  Card,
  PageContainer,
  Skeleton,
  ErrorBox,
  formatNgn,
  formatDate,
} from "@/components/app/ui";

export default function TenantWalletPage() {
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => tenantApi.getWallet(),
  });
  const txns = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => tenantApi.getWalletTransactions(),
  });

  return (
    <>
      <TenantTopbar
        title="Wallet"
        subtitle="Your referral earnings. Withdraw to your bank anytime (minimum ₦1,000)."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/me/wallet/bank-accounts"
              aria-label="Bank accounts"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <Landmark className="h-4 w-4" /> <span className="hidden sm:inline">Bank accounts</span>
            </Link>
            <Link
              href="/me/wallet/withdraw"
              aria-label="Withdraw"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              <ArrowDownToLine className="h-4 w-4" /> <span className="hidden sm:inline">Withdraw</span>
            </Link>
          </div>
        }
      />
      <PageContainer>
        {wallet.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-10 w-40" />
          </Card>
        ) : wallet.isError ? (
          <ErrorBox
            message={(wallet.error as Error)?.message ?? "Couldn't load your wallet"}
            onRetry={() => wallet.refetch()}
          />
        ) : (
          <>
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Wallet balance
              </p>
              <p className="mt-3 font-amount text-4xl font-extrabold leading-none text-foundation-700">
                {formatNgn(wallet.data?.balance ?? 0)}
              </p>
            </Card>

            <p className="mt-4 text-[13px] text-ink-muted">
              Earn more by inviting your landlord or caretaker.{" "}
              <Link
                href="/me/refer"
                className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
              >
                Refer & Earn
              </Link>
            </p>
          </>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Recent activity
          </h2>
          {txns.isLoading ? (
            <Card className="divide-y divide-foundation-700/10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </Card>
          ) : txns.isError ? (
            <ErrorBox
              message={(txns.error as Error)?.message}
              onRetry={() => txns.refetch()}
            />
          ) : (txns.data ?? []).length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-ink-muted">
              No earnings yet. Invite your landlord or caretaker to start earning.
            </Card>
          ) : (
            <Card className="divide-y divide-foundation-700/10">
              {txns.data!.map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-foundation-700">
                      {t.description}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {formatDate(t.createdAt)}
                    </p>
                  </div>
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
                </div>
              ))}
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
