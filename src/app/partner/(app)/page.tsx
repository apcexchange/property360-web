"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import partnerApi from "@/lib/partner-api";
import { landlordApi } from "@/lib/landlord-api";
import { Card, formatNgn } from "@/components/app/ui";

export default function PartnerPage() {
  const qc = useQueryClient();
  const earnings = useQuery({
    queryKey: ["partner", "me"],
    queryFn: () => partnerApi.getMyPartner(),
  });
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => landlordApi.wallet(),
  });
  const banks = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => landlordApi.listBankAccounts(),
  });
  const kyc = useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => landlordApi.kycStatus(),
  });

  const [amount, setAmount] = useState("");
  const primaryBank =
    (banks.data ?? []).find((b) => b.isPrimary && b.isVerified) ??
    (banks.data ?? []).find((b) => b.isVerified);

  const withdraw = useMutation({
    mutationFn: () =>
      landlordApi.requestPayout({
        amount: Number(amount),
        bankAccountId: primaryBank!._id,
      }),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  if (earnings.isLoading) {
    return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  }
  if (earnings.isError || !earnings.data) {
    return (
      <div className="p-8 text-sm text-red-700">
        Couldn&apos;t load your earnings. Please refresh the page.
      </div>
    );
  }
  const e = earnings.data;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold text-foundation-700">
        Your partner earnings
      </h1>

      {e.isPartner && e.codes.length > 0 && (
        <Card className="p-5">
          <p className="text-sm text-ink-muted">
            Your code{e.codes.length > 1 ? "s" : ""}
          </p>
          {e.codes.map((c, i) => (
            <div
              key={c.code}
              className="mt-2 flex items-center justify-between gap-3"
            >
              <span className="font-display text-xl font-extrabold text-foundation-700">
                {c.code}
              </span>
              <span className="text-sm text-ink-muted">
                {c.commissionRate}% · {c.status}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() =>
                  navigator.clipboard.writeText(e.shareUrls[i] ?? "")
                }
              >
                Copy link
              </button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase text-ink-muted">Signups</p>
          <p className="mt-1 text-2xl font-extrabold text-foundation-700">
            {e.signups}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-ink-muted">Paid conversions</p>
          <p className="mt-1 text-2xl font-extrabold text-foundation-700">
            {e.paidConversions}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-ink-muted">Total earned</p>
          <p className="mt-1 text-2xl font-extrabold text-foundation-700">
            {formatNgn(e.totalEarned)}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm text-ink-muted">Wallet balance</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-foundation-700">
          {formatNgn(wallet.data?.balance ?? 0)}
        </p>

        {kyc.data?.status !== "verified" ? (
          <p className="mt-3 text-sm text-amber-700">
            Complete identity verification to withdraw.{" "}
            <a className="underline" href="/partner/kyc">
              Verify now
            </a>
            .
          </p>
        ) : !primaryBank ? (
          <p className="mt-3 text-sm text-amber-700">
            Add a bank account to withdraw.{" "}
            <a className="underline" href="/partner/bank">
              Add bank
            </a>
            .
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="rounded border px-3 py-2"
              placeholder="Amount (₦)"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-foundation-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={withdraw.isPending || !amount || Number(amount) <= 0}
              onClick={() => withdraw.mutate()}
            >
              {withdraw.isPending
                ? "Requesting…"
                : `Withdraw to ${primaryBank.bankName}`}
            </button>
          </div>
        )}
        {withdraw.isError && (
          <p className="mt-3 text-sm text-red-700">
            Couldn&apos;t request the withdrawal. Please try again.
          </p>
        )}
      </Card>
    </main>
  );
}
