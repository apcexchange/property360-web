"use client";

import { useQuery } from "@tanstack/react-query";
import { TenantTopbar } from "@/components/me/Topbar";
import { tenantApi } from "@/lib/tenant-api";
import { WalletFundCard } from "@/components/app/WalletFundCard";
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
    refetchInterval: (q) => (q.state.data?.dvaStatus === "pending" ? 12_000 : false),
  });
  const txns = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => tenantApi.getWalletTransactions(),
  });

  return (
    <>
      <TenantTopbar
        title="Wallet"
        subtitle="Fund your wallet and pay rent or fees straight from the balance"
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

            <div className="mt-4">
              <WalletFundCard wallet={wallet.data} />
            </div>
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
              No transactions yet.
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
