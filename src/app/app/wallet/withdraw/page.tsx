"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  formatNgn,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

export default function WithdrawPage() {
  const router = useRouter();
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => landlordApi.wallet(),
  });
  const accounts = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => landlordApi.listBankAccounts(),
  });

  const verifiedAccounts = (accounts.data ?? []).filter((a) => a.isVerified);
  const primaryId = verifiedAccounts.find((a) => a.isPrimary)?._id ?? verifiedAccounts[0]?._id ?? "";

  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [amount, setAmount] = useState(0);

  const selectedAccount =
    bankAccountId
      ? verifiedAccounts.find((a) => a._id === bankAccountId)
      : verifiedAccounts.find((a) => a._id === primaryId);

  const effectiveAccountId = bankAccountId || primaryId;
  const balance = wallet.data?.balance ?? 0;
  const canSubmit = amount > 0 && amount <= balance && !!effectiveAccountId;

  const withdraw = useMutation({
    mutationFn: () =>
      landlordApi.requestPayout({
        amount,
        bankAccountId: effectiveAccountId,
      }),
    onSuccess: () => router.push("/app/wallet"),
  });

  const formError = (() => {
    if (!withdraw.isError) return null;
    const err = withdraw.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <AppTopbar
        title="Withdraw"
        subtitle="Send your wallet balance to a verified bank account"
        actions={
          <Link
            href="/app/wallet"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) withdraw.mutate();
          }}
        >
          <Card className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Available balance
            </p>
            <p className="mt-2 font-display text-[32px] font-extrabold leading-none text-foundation-700">
              {wallet.isLoading ? (
                <Skeleton className="inline-block h-8 w-40" />
              ) : (
                formatNgn(balance)
              )}
            </p>
          </Card>

          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Destination
            </h2>
            {accounts.isLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : verifiedAccounts.length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                You need at least one verified bank account.{" "}
                <Link
                  href="/app/wallet/bank-accounts"
                  className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                >
                  Add one here
                </Link>
                .
              </p>
            ) : (
              <select
                value={effectiveAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              >
                {verifiedAccounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.bankName} · {a.accountNumber} · {a.accountName}
                    {a.isPrimary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedAccount && (
              <p className="text-[12px] text-ink-muted">
                Payout will land in <strong>{selectedAccount.accountName}</strong>{" "}
                ({selectedAccount.bankName}, {selectedAccount.accountNumber}).
              </p>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Amount (NGN)
            </label>
            <input
              type="number"
              value={String(amount)}
              onChange={(e) =>
                setAmount(Math.max(0, Number(e.target.value) || 0))
              }
              max={balance}
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[18px] font-semibold text-foundation-700"
            />
            <div className="flex flex-wrap items-center gap-2">
              {[0.25, 0.5, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(Math.floor(balance * p))}
                  className="rounded-full border border-foundation-700/15 bg-paper px-3 py-1 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                >
                  {p === 1 ? "Max" : `${p * 100}%`}
                </button>
              ))}
            </div>
            {amount > balance && (
              <p className="text-[12.5px] text-red-700">
                Amount exceeds available balance.
              </p>
            )}
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/wallet"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || withdraw.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {withdraw.isPending ? "Sending…" : `Withdraw ${formatNgn(amount)}`}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}
