"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Star, Trash2, Check } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

export default function BankAccountsPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const accounts = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => landlordApi.listBankAccounts(),
  });
  const banks = useQuery({
    queryKey: ["banks"],
    queryFn: () => landlordApi.listBanks(),
  });

  const [adding, setAdding] = useState(false);

  const setPrimary = useMutation({
    mutationFn: (id: string) => landlordApi.setPrimaryBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Primary bank account updated");
    },
    onError: () => toast.error("Couldn't update primary account"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => landlordApi.deleteBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Bank account removed");
    },
    onError: () => toast.error("Couldn't remove account"),
  });

  return (
    <>
      <AppTopbar
        title="Bank accounts"
        subtitle="Where your wallet withdrawals will land"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/app/wallet"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
              >
                <Plus className="h-4 w-4" /> Add account
              </button>
            )}
          </div>
        }
      />
      <PageContainer>
        {adding && (
          <div className="mb-6">
            <AddBankAccountForm
              banks={banks.data ?? []}
              banksLoading={banks.isLoading}
              onCancel={() => setAdding(false)}
              onSuccess={() => {
                setAdding(false);
                qc.invalidateQueries({ queryKey: ["bank-accounts"] });
              }}
            />
          </div>
        )}

        {accounts.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </Card>
        ) : accounts.isError ? (
          <ErrorBox
            message={(accounts.error as Error)?.message}
            onRetry={() => accounts.refetch()}
          />
        ) : (accounts.data ?? []).length === 0 && !adding ? (
          <EmptyState
            title="No bank accounts"
            body="Add a Nigerian bank account so we can pay out your wallet balance."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {accounts.data!.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-foundation-700">
                      {a.accountName}
                    </p>
                    {a.isPrimary && (
                      <StatusPill label="Primary" tone="good" />
                    )}
                    {!a.isVerified && (
                      <StatusPill label="Unverified" tone="warn" />
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {a.bankName} · {a.accountNumber}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!a.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary.mutate(a._id)}
                      disabled={setPrimary.isPending}
                      className="rounded-full p-2 text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700 disabled:opacity-50"
                      title="Make primary"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this bank account?")) remove.mutate(a._id);
                    }}
                    disabled={remove.isPending}
                    className="rounded-full p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}

function AddBankAccountForm({
  banks,
  banksLoading,
  onCancel,
  onSuccess,
}: {
  banks: { code: string; name: string }[];
  banksLoading: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [verified, setVerified] = useState<{
    accountName: string;
    accountNumber: string;
  } | null>(null);

  const verify = useMutation({
    mutationFn: () => landlordApi.verifyBank({ accountNumber, bankCode }),
    onSuccess: (data) => setVerified(data),
  });
  const add = useMutation({
    mutationFn: () => {
      const bank = banks.find((b) => b.code === bankCode);
      return landlordApi.addBankAccount({
        accountNumber,
        bankCode,
        bankName: bank?.name ?? "",
        accountName: verified!.accountName,
      });
    },
    onSuccess,
  });

  const formError = (() => {
    if (verify.isError) {
      const err = verify.error as AxiosError<{ message?: string }>;
      return err.response?.data?.message ?? (err as Error).message;
    }
    if (add.isError) {
      const err = add.error as AxiosError<{ message?: string }>;
      return err.response?.data?.message ?? (err as Error).message;
    }
    return null;
  })();

  return (
    <Card className="p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Add bank account
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Bank
          </label>
          <select
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              setVerified(null);
            }}
            disabled={banksLoading}
            className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
          >
            <option value="">{banksLoading ? "Loading banks…" : "Choose a bank"}</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Account number
          </label>
          <input
            value={accountNumber}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              setAccountNumber(onlyDigits.slice(0, 10));
              setVerified(null);
            }}
            placeholder="10 digits"
            inputMode="numeric"
            className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
          />
        </div>
      </div>

      {verified && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-700">
          <Check className="h-4 w-4" /> Account name: <strong>{verified.accountName}</strong>
        </div>
      )}

      {formError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          {formError}
        </p>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        {!verified ? (
          <button
            type="button"
            onClick={() => verify.mutate()}
            disabled={
              accountNumber.length !== 10 || !bankCode || verify.isPending
            }
            className="rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {verify.isPending ? "Verifying…" : "Verify"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {add.isPending ? "Saving…" : "Save account"}
          </button>
        )}
      </div>
    </Card>
  );
}
