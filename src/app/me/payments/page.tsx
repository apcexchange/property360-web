"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Banknote, CreditCard, X } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import {
  tenantApi,
  FEE_LABEL,
  FeeType,
  FeeItem,
  PayInitResponse,
  OfflinePaymentMethod,
  Payment,
  daysUntilDueLabel,
} from "@/lib/tenant-api";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <PaymentsInner />
    </Suspense>
  );
}

function PaymentsInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const router = useRouter();
  const reference = params?.get("reference") ?? null;

  // After a Paystack redirect we land back with ?reference=, verify it and
  // strip it from the URL once we've refetched payment state.
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    setVerifyMsg("Verifying payment…");
    tenantApi
      .verifyPayment(reference)
      .then(() => {
        if (cancelled) return;
        setVerifyMsg("Payment verified. Updated balances below.");
        qc.invalidateQueries({ queryKey: ["me"] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const ax = err as AxiosError<{ message?: string }>;
        setVerifyMsg(
          ax.response?.data?.message ??
            "We couldn't verify the payment yet. It may take a few moments, check back shortly."
        );
      })
      .finally(() => {
        router.replace("/me/payments");
      });
    return () => {
      cancelled = true;
    };
  }, [reference, qc, router]);

  const summary = useQuery({
    queryKey: ["me", "payments", "summary"],
    queryFn: () => tenantApi.getPaymentSummary(),
  });
  const history = useQuery({
    queryKey: ["me", "payments", "history"],
    queryFn: () => tenantApi.getPaymentHistory(),
  });

  const [recordOpen, setRecordOpen] = useState<
    | { kind: "rent"; amount: number }
    | { kind: "fee"; feeType: FeeType; amount: number; label: string }
    | null
  >(null);

  return (
    <>
      <TenantTopbar
        title="Payments"
        subtitle="Pay rent, settle fees, record offline payments"
      />
      <PageContainer>
        {verifyMsg && (
          <Card className="mb-6 border-cryola-400 bg-cryola-200/40 p-4">
            <p className="text-[13px] text-foundation-700">{verifyMsg}</p>
          </Card>
        )}

        {summary.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        ) : summary.isError ? (
          <ErrorBox
            message={(summary.error as Error)?.message}
            onRetry={() => summary.refetch()}
          />
        ) : !summary.data ? (
          <Card className="p-6 text-center text-[13px] text-ink-muted">
            No active lease to bill against yet.
          </Card>
        ) : (
          <>
            <RentSection
              outstanding={summary.data.rentOutstanding}
              monthlyRent={summary.data.monthlyRent}
              nextDueDate={summary.data.nextDueDate}
              daysUntilDue={summary.data.daysUntilDue}
              onRecord={(amount) =>
                setRecordOpen({ kind: "rent", amount })
              }
            />

            <FeesSection
              fees={summary.data.fees}
              totalOutstanding={summary.data.totalFeesOutstanding}
              onRecord={(feeType, amount, label) =>
                setRecordOpen({ kind: "fee", feeType, amount, label })
              }
            />
          </>
        )}

        <HistorySection
          isLoading={history.isLoading}
          isError={history.isError}
          error={history.error as Error | null}
          onRetry={() => history.refetch()}
          payments={history.data ?? []}
        />
      </PageContainer>

      {recordOpen && (
        <RecordPaymentModal
          state={recordOpen}
          onClose={() => setRecordOpen(null)}
        />
      )}
    </>
  );
}

function RentSection({
  outstanding,
  monthlyRent,
  nextDueDate,
  daysUntilDue,
  onRecord,
}: {
  outstanding: number;
  monthlyRent: number;
  nextDueDate: string | null;
  daysUntilDue: number;
  onRecord: (amount: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const pay = useMutation({
    mutationFn: () =>
      tenantApi.initiateInvoicePayment({
        invoiceId: "",
        amount: outstanding > 0 ? outstanding : monthlyRent,
        callbackUrl: typeof window !== "undefined"
          ? `${window.location.origin}/me/payments`
          : undefined,
      }),
    onSuccess: (res: PayInitResponse) => {
      const url = res.authorizationUrl ?? res.authorization_url;
      if (url) window.location.href = url;
      else setError("Payment link was not returned.");
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err as Error).message ??
          "Could not start payment. If you don't have an open invoice, ask your landlord to issue one."
      );
    },
  });

  const dueLabel = nextDueDate ? daysUntilDueLabel(daysUntilDue) : null;
  const dueTone: "good" | "warn" | "bad" =
    daysUntilDue < 0 ? "bad" : daysUntilDue <= 7 ? "warn" : "good";

  return (
    <Card className="mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Outstanding rent
          </p>
          <p className="mt-2 font-display text-[28px] font-extrabold text-foundation-700">
            {formatNgn(outstanding)}
          </p>
          <p className="mt-1 text-[13px] text-ink-muted">
            Monthly rent {formatNgn(monthlyRent)}
            {nextDueDate ? ` · next due ${formatDate(nextDueDate)}` : ""}
          </p>
        </div>
        {dueLabel && <StatusPill label={dueLabel} tone={dueTone} />}
      </div>
      {error && <p className="mt-3 text-[12.5px] text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            pay.mutate();
          }}
          disabled={pay.isPending || outstanding <= 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />{" "}
          {pay.isPending ? "Starting payment…" : "Pay rent online"}
        </button>
        <button
          type="button"
          onClick={() => onRecord(outstanding > 0 ? outstanding : monthlyRent)}
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <Banknote className="h-4 w-4" /> Record cash payment
        </button>
      </div>
    </Card>
  );
}

function FeesSection({
  fees,
  totalOutstanding,
  onRecord,
}: {
  fees: FeeItem[];
  totalOutstanding: number;
  onRecord: (feeType: FeeType, amount: number, label: string) => void;
}) {
  const outstanding = fees.filter((f) => f.outstanding > 0);
  const [error, setError] = useState<string | null>(null);

  const payAll = useMutation({
    mutationFn: () =>
      tenantApi.payAllFees(
        typeof window !== "undefined"
          ? `${window.location.origin}/me/payments`
          : undefined
      ),
    onSuccess: (res: PayInitResponse) => {
      const url = res.authorizationUrl ?? res.authorization_url;
      if (url) window.location.href = url;
      else setError("Payment link was not returned.");
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not start payment"
      );
    },
  });

  if (outstanding.length === 0 && totalOutstanding <= 0) return null;

  return (
    <Card className="mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Outstanding fees
          </p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-foundation-700">
            {formatNgn(totalOutstanding)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            payAll.mutate();
          }}
          disabled={payAll.isPending || totalOutstanding <= 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />{" "}
          {payAll.isPending ? "Starting payment…" : "Pay all online"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-red-700">{error}</p>}
      <ul className="mt-4 divide-y divide-foundation-700/10">
        {outstanding.map((f) => (
          <FeeRow key={f.type} fee={f} onRecord={onRecord} />
        ))}
      </ul>
    </Card>
  );
}

function FeeRow({
  fee,
  onRecord,
}: {
  fee: FeeItem;
  onRecord: (feeType: FeeType, amount: number, label: string) => void;
}) {
  const feeType = fee.type as FeeType;
  const label = fee.label || FEE_LABEL[feeType] || fee.type;
  const [error, setError] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: () =>
      tenantApi.payFee({
        feeType,
        amount: fee.outstanding,
        callbackUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}/me/payments`
            : undefined,
      }),
    onSuccess: (res: PayInitResponse) => {
      const url = res.authorizationUrl ?? res.authorization_url;
      if (url) window.location.href = url;
      else setError("Payment link was not returned.");
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not start payment"
      );
    },
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-foundation-700">
          {label}
        </p>
        <p className="text-[11.5px] text-ink-muted">
          Total {formatNgn(fee.amount)} · paid {formatNgn(fee.paid)}
        </p>
        {error && (
          <p className="mt-1 text-[11.5px] text-red-700">{error}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-[16px] font-extrabold text-foundation-700">
          {formatNgn(fee.outstanding)}
        </span>
        <button
          type="button"
          onClick={() => {
            setError(null);
            pay.mutate();
          }}
          disabled={pay.isPending}
          className="rounded-full bg-foundation-700 px-3.5 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          {pay.isPending ? "Loading…" : "Pay"}
        </button>
        <button
          type="button"
          onClick={() => onRecord(feeType, fee.outstanding, label)}
          className="rounded-full border border-foundation-700/15 bg-paper px-3.5 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          Record
        </button>
      </div>
    </li>
  );
}

function HistorySection({
  isLoading,
  isError,
  error,
  onRetry,
  payments,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  payments: Payment[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Payment history
      </h2>
      {isLoading ? (
        <Card className="p-5">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={onRetry} />
      ) : payments.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-ink-muted">
          No payments recorded yet.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-5 gap-3 border-b border-foundation-700/10 bg-foundation-700/5 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:grid">
            <span>Date</span>
            <span>Type</span>
            <span>Method</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>
          <ul className="divide-y divide-foundation-700/10">
            {payments.map((p) => (
              <li
                key={p._id}
                className="grid grid-cols-2 gap-3 px-5 py-3 text-[13px] sm:grid-cols-5"
              >
                <span className="text-foundation-700">
                  {formatDate(p.paymentDate ?? p.createdAt)}
                </span>
                <span className="text-foundation-700">
                  {p.type || "—"}
                </span>
                <span className="text-foundation-700">
                  {p.paymentMethod || "—"}
                </span>
                <span>
                  <StatusPill
                    label={p.status}
                    tone={
                      p.status === "completed"
                        ? "good"
                        : p.status === "pending"
                        ? "warn"
                        : p.status === "failed"
                        ? "bad"
                        : "neutral"
                    }
                  />
                </span>
                <span className="text-right font-semibold text-foundation-700">
                  {formatNgn(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function RecordPaymentModal({
  state,
  onClose,
}: {
  state:
    | { kind: "rent"; amount: number }
    | { kind: "fee"; feeType: FeeType; amount: number; label: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(state.amount));
  const [method, setMethod] = useState<OfflinePaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => {
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return Promise.reject(new Error("Enter a valid amount."));
      }
      if (state.kind === "rent") {
        return tenantApi.markRentPaid({
          amount: numAmount,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        });
      }
      return tenantApi.markFeePaid({
        feeType: state.feeType,
        amount: numAmount,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "payments"] });
      qc.invalidateQueries({ queryKey: ["me", "dashboard"] });
      onClose();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? (err as Error).message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-700/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-paper p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Record payment
            </p>
            <p className="mt-1 font-display text-[18px] font-extrabold text-foundation-700">
              {state.kind === "rent" ? "Rent" : state.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            submit.mutate();
          }}
        >
          <Field label="Amount (NGN)">
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              required
            />
          </Field>
          <Field label="Method">
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as OfflinePaymentMethod)
              }
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. paid via bank transfer to landlord on Monday"
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13.5px] text-foundation-700"
            />
          </Field>
          {error && (
            <p className="text-[12.5px] text-red-700">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {submit.isPending ? "Saving…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
