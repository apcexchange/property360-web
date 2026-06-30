"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  Check,
  X,
  Copy,
  Wallet,
  Landmark,
  Plus,
} from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import { session } from "@/lib/session";
import {
  tenantApi,
  BillShare,
  BillShareStatus,
  SharedBillWithdrawal,
  TenantBankAccount,
} from "@/lib/tenant-api";

const SHARE_TONE: Record<BillShareStatus, "good" | "warn" | "bad" | "neutral"> = {
  paid: "good",
  pending_confirmation: "warn",
  disputed: "bad",
  exempt: "neutral",
  unpaid: "neutral",
};
const SHARE_LABEL: Record<BillShareStatus, string> = {
  paid: "Paid",
  pending_confirmation: "Awaiting confirmation",
  disputed: "Disputed",
  exempt: "Exempt",
  unpaid: "Unpaid",
};

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = session.getUser();
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ["me", "bill", id],
    queryFn: () => tenantApi.getSharedBill(id),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const detail = q.data;
  const bill = detail?.bill;
  const escrow = !!bill?.escrowEnabled;
  const isCreator = !!bill && bill.creator._id === me?._id;
  const myShare = detail?.shares.find((s) => s.tenant._id === me?._id) ?? null;
  const hasConfirmedPayment = (detail?.shares ?? []).some(
    (s) => s.status === "paid"
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["me", "bill", id] });

  const markPaid = useMutation({
    mutationFn: (shareId: string) => tenantApi.markBillSharePaid(id, shareId),
    onSuccess: () => {
      invalidate();
      toast.success("Marked as paid, waiting for confirmation");
    },
    onError: (err) => toast.error(errMsg(err)),
  });
  const confirm = useMutation({
    mutationFn: (shareId: string) => tenantApi.confirmBillShare(id, shareId),
    onSuccess: () => {
      invalidate();
      toast.success("Payment confirmed");
    },
    onError: (err) => toast.error(errMsg(err)),
  });
  const dispute = useMutation({
    mutationFn: ({ shareId, reason }: { shareId: string; reason: string }) =>
      tenantApi.disputeBillShare(id, shareId, reason),
    onSuccess: () => {
      invalidate();
      toast.success("Marked as not received");
    },
    onError: (err) => toast.error(errMsg(err)),
  });
  const cancel = useMutation({
    mutationFn: () => tenantApi.cancelSharedBill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "bills"] });
      invalidate();
      toast.success("Bill cancelled");
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const progressPct =
    detail && detail.progress.amountTotal > 0
      ? Math.min(
          100,
          (detail.progress.amountPaid / detail.progress.amountTotal) * 100
        )
      : 0;

  return (
    <>
      <TenantTopbar
        title={bill?.title ?? "Shared bill"}
        subtitle={bill ? bill.property?.name : undefined}
        actions={
          <Link
            href="/me/bills"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-40 w-full" />
          </Card>
        ) : q.isError || !detail || !bill ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Bill not found."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            {/* Total + progress */}
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Total
                  </p>
                  <p className="mt-1.5 font-display text-[26px] font-extrabold text-foundation-700">
                    {formatNgn(bill.totalAmount)}
                  </p>
                </div>
                <StatusPill
                  label={bill.status}
                  tone={
                    bill.status === "settled"
                      ? "good"
                      : bill.status === "cancelled"
                      ? "neutral"
                      : "warn"
                  }
                />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-foundation-700/10">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-muted">
                {detail.progress.paidCount} of {detail.progress.totalCount} paid
                · {formatNgn(detail.progress.amountPaid)} received
              </p>
            </Card>

            {/* Payment destination */}
            {escrow ? (
              <EscrowWallet billId={id} />
            ) : (
              bill.bankDetails && (
                <Card className="mt-6 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-foundation-700" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Pay to this account
                    </p>
                  </div>
                  <div className="space-y-1 text-[13.5px] text-foundation-700">
                    <p className="font-display text-[18px] font-bold tracking-wide">
                      {bill.bankDetails.accountNumber}
                    </p>
                    <p className="text-ink-muted">
                      {bill.bankDetails.bankName} ·{" "}
                      {bill.bankDetails.accountName}
                    </p>
                  </div>
                  <p className="mt-3 text-[11.5px] text-ink-muted">
                    Transfer your share to this account, then tap “I’ve paid” so{" "}
                    {bill.creator.firstName} can confirm it.
                  </p>
                </Card>
              )
            )}

            {/* Your share action (non-escrow only) */}
            {!escrow && myShare && (
              <YourShareCard
                share={myShare}
                onMarkPaid={() => markPaid.mutate(myShare._id)}
                pending={markPaid.isPending}
              />
            )}

            {/* Shares */}
            <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Shares
            </h2>
            <Card className="divide-y divide-foundation-700/10">
              {detail.shares.map((s) => (
                <ShareRow
                  key={s._id}
                  share={s}
                  isMine={s.tenant._id === me?._id}
                  canModerate={isCreator && !escrow}
                  onConfirm={() => confirm.mutate(s._id)}
                  onDispute={(reason) =>
                    dispute.mutate({ shareId: s._id, reason })
                  }
                  busy={confirm.isPending || dispute.isPending}
                />
              ))}
            </Card>

            {/* Cancel (creator, open, nothing confirmed) */}
            {isCreator && bill.status === "open" && !hasConfirmedPayment && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmWindow("Cancel this bill for everyone?"))
                      cancel.mutate();
                  }}
                  disabled={cancel.isPending}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel bill"}
                </button>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}

function YourShareCard({
  share,
  onMarkPaid,
  pending,
}: {
  share: BillShare;
  onMarkPaid: () => void;
  pending: boolean;
}) {
  const payable = share.status === "unpaid" || share.status === "disputed";
  return (
    <Card className="mt-6 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Your share
      </p>
      <p className="mt-1.5 font-display text-[22px] font-extrabold text-foundation-700">
        {formatNgn(share.amount)}
      </p>
      {share.status === "pending_confirmation" && (
        <p className="mt-1 text-[12.5px] text-amber-700">
          Waiting for the bill creator to confirm your payment.
        </p>
      )}
      {share.status === "disputed" && (
        <p className="mt-1 text-[12.5px] text-red-700">
          The creator hasn’t seen your transfer
          {share.disputeReason ? `: “${share.disputeReason}”` : ""}. Re-send and
          mark it paid again.
        </p>
      )}
      {share.status === "paid" && (
        <p className="mt-1 text-[12.5px] text-emerald-700">
          Your share is settled. Thank you!
        </p>
      )}
      {payable && (
        <button
          type="button"
          onClick={onMarkPaid}
          disabled={pending}
          className="mt-4 w-full rounded-full bg-foundation-700 px-5 py-3 text-[14px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {pending ? "Saving…" : "I’ve paid"}
        </button>
      )}
    </Card>
  );
}

function ShareRow({
  share,
  isMine,
  canModerate,
  onConfirm,
  onDispute,
  busy,
}: {
  share: BillShare;
  isMine: boolean;
  canModerate: boolean;
  onConfirm: () => void;
  onDispute: (reason: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-foundation-700">
          {share.tenant.firstName} {share.tenant.lastName}
          {isMine && <span className="text-ink-muted"> (you)</span>}
        </p>
        <p className="text-[11.5px] text-ink-muted">
          {share.unit?.unitNumber ? `Unit ${share.unit.unitNumber} · ` : ""}
          {formatNgn(share.amount)}
        </p>
      </div>
      {canModerate && share.status === "pending_confirmation" ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            title="Confirm received"
            className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const reason = promptWindow("Why are you disputing this payment?");
              if (reason) onDispute(reason);
            }}
            disabled={busy}
            title="Not received"
            className="grid h-8 w-8 place-items-center rounded-full bg-red-100 text-red-700 transition hover:bg-red-200 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <StatusPill
          label={SHARE_LABEL[share.status]}
          tone={SHARE_TONE[share.status]}
        />
      )}
    </div>
  );
}

function EscrowWallet({ billId }: { billId: string }) {
  const me = session.getUser();
  const qc = useQueryClient();
  const toast = useToast();
  const [requesting, setRequesting] = useState(false);

  const wallet = useQuery({
    queryKey: ["me", "bill-wallet", billId],
    queryFn: () => tenantApi.getBillWallet(billId),
    refetchInterval: 12_000,
  });
  const txns = useQuery({
    queryKey: ["me", "bill-wallet-txns", billId],
    queryFn: () => tenantApi.listBillWalletTransactions(billId),
  });
  const withdrawals = useQuery({
    queryKey: ["me", "bill-withdrawals", billId],
    queryFn: () => tenantApi.listBillWithdrawals(billId),
    refetchInterval: 15_000,
  });

  const vote = useMutation({
    mutationFn: ({
      withdrawalId,
      decision,
    }: {
      withdrawalId: string;
      decision: "approve" | "reject";
    }) => tenantApi.voteBillWithdrawal(billId, withdrawalId, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "bill-withdrawals", billId] });
      qc.invalidateQueries({ queryKey: ["me", "bill-wallet", billId] });
      toast.success("Vote recorded");
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const w = wallet.data;
  const balance = w?.balance ?? 0;
  const activeWithdrawal = (withdrawals.data ?? []).find((x) =>
    ["pending", "approved", "processing"].includes(x.status)
  );

  function copyAccount() {
    if (w?.dvaAccountNumber && typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(w.dvaAccountNumber);
      toast.success("Account number copied");
    }
  }

  return (
    <>
      {/* Balance + DVA */}
      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-foundation-700" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Group wallet
          </p>
        </div>
        <p className="mt-2 font-display text-[26px] font-extrabold text-foundation-700">
          {formatNgn(balance)}
        </p>

        {wallet.isLoading ? (
          <Skeleton className="mt-3 h-10 w-full" />
        ) : w?.dvaStatus === "active" && w.dvaAccountNumber ? (
          <div className="mt-3 rounded-2xl bg-foundation-700/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Transfer to this account
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className="font-display text-[18px] font-bold tracking-wide text-foundation-700">
                {w.dvaAccountNumber}
              </p>
              <button
                type="button"
                onClick={copyAccount}
                className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="mt-1 text-[12px] text-ink-muted">{w.dvaBankName}</p>
            <p className="mt-2 text-[11.5px] text-ink-muted">
              Transfer your share here. The wallet credits automatically and
              your share is marked paid.
            </p>
          </div>
        ) : w?.dvaStatus === "failed" ? (
          <p className="mt-3 text-[12.5px] text-red-700">
            Couldn’t set up the wallet account
            {w.dvaFailureReason ? `: ${w.dvaFailureReason}` : ""}.
          </p>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-muted">
            Generating the wallet account number…
          </p>
        )}

        <button
          type="button"
          onClick={() => setRequesting(true)}
          disabled={balance <= 0 || !!activeWithdrawal}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          Request withdrawal
        </button>
        {activeWithdrawal && (
          <p className="mt-2 text-[11.5px] text-ink-muted">
            A withdrawal is already in progress, settle it first.
          </p>
        )}
      </Card>

      {/* Withdrawals */}
      {(withdrawals.data ?? []).length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Withdrawals
          </h2>
          <Card className="divide-y divide-foundation-700/10">
            {withdrawals.data!.map((x) => (
              <WithdrawalRow
                key={x._id}
                w={x}
                meId={me?._id}
                onVote={(decision) =>
                  vote.mutate({ withdrawalId: x._id, decision })
                }
                busy={vote.isPending}
              />
            ))}
          </Card>
        </>
      )}

      {/* Transactions */}
      <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Activity
      </h2>
      <Card>
        {txns.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (txns.data ?? []).length === 0 ? (
          <p className="p-5 text-[13px] text-ink-muted">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-foundation-700/10">
            {txns.data!.map((t) => {
              const inflow = t.type === "credit" || t.type === "refund";
              return (
                <li
                  key={t._id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foundation-700">
                      {t.attributedTenant
                        ? `${t.attributedTenant.firstName} ${t.attributedTenant.lastName}`
                        : t.description}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      {formatDate(t.createdAt)} · {t.type}
                    </p>
                  </div>
                  <p
                    className={`text-[13.5px] font-bold ${
                      inflow ? "text-emerald-700" : "text-foundation-700"
                    }`}
                  >
                    {inflow ? "+" : "−"}
                    {formatNgn(t.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {requesting && (
        <RequestWithdrawalModal
          billId={billId}
          balance={balance}
          onClose={() => setRequesting(false)}
        />
      )}
    </>
  );
}

function WithdrawalRow({
  w,
  meId,
  onVote,
  busy,
}: {
  w: SharedBillWithdrawal;
  meId?: string;
  onVote: (decision: "approve" | "reject") => void;
  busy: boolean;
}) {
  const approveCount = w.approvals.filter((a) => a.decision === "approve").length;
  const voted = w.approvals.some(
    (a) => (typeof a.user === "string" ? a.user : a.user._id) === meId
  );
  const isInitiator = w.initiator._id === meId;
  const canVote = w.status === "pending" && !voted && !isInitiator;
  const tone: "good" | "warn" | "bad" | "neutral" =
    w.status === "completed"
      ? "good"
      : w.status === "rejected" || w.status === "failed" || w.status === "expired"
      ? "bad"
      : w.status === "pending"
      ? "warn"
      : "neutral";

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foundation-700">
            {formatNgn(w.amount)}
          </p>
          <p className="text-[11.5px] text-ink-muted">
            By {w.initiator.firstName} {w.initiator.lastName}
            {isInitiator ? " (you)" : ""} · {approveCount}/{w.requiredApprovals}{" "}
            approvals
          </p>
          {w.bankAccount && (
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              To {w.bankAccount.bankName} · {w.bankAccount.accountNumber}
            </p>
          )}
          {w.note && (
            <p className="mt-0.5 text-[11.5px] text-ink-muted">“{w.note}”</p>
          )}
        </div>
        <StatusPill label={w.status} tone={tone} />
      </div>
      {canVote && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onVote("reject")}
            disabled={busy}
            className="flex-1 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onVote("approve")}
            disabled={busy}
            className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      )}
      {voted && w.status === "pending" && (
        <p className="mt-2 text-[11.5px] text-ink-muted">You’ve voted.</p>
      )}
    </div>
  );
}

function RequestWithdrawalModal({
  billId,
  balance,
  onClose,
}: {
  billId: string;
  balance: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const accounts = useQuery({
    queryKey: ["me", "bank-accounts"],
    queryFn: () => tenantApi.listBankAccounts(),
  });
  const verified = (accounts.data ?? []).filter((a) => a.isVerified);

  const numeric = Number(amount.replace(/[^0-9.]/g, ""));
  const overBalance = numeric > balance;
  const canSubmit =
    numeric >= 100 && !overBalance && bankAccountId.length > 0;

  const request = useMutation({
    mutationFn: () =>
      tenantApi.requestBillWithdrawal(billId, {
        amount: numeric,
        bankAccountId,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "bill-withdrawals", billId] });
      qc.invalidateQueries({ queryKey: ["me", "bill-wallet", billId] });
      toast.success("Withdrawal requested, neighbours will vote");
      onClose();
    },
    onError: (err) => setError(errMsg(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foundation-900/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-bold text-foundation-700">
            Request withdrawal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) request.mutate();
          }}
        >
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Amount
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(balance)))}
                className="text-[11.5px] font-semibold text-foundation-700 hover:underline"
              >
                Max {formatNgn(balance)}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-foundation-700/15 bg-surface px-4 py-3">
              <span className="text-[18px] font-semibold text-ink-muted">₦</span>
              <input
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9]/g, ""))
                }
                inputMode="numeric"
                placeholder="0"
                className="w-full bg-transparent text-[20px] font-bold text-foundation-700 focus:outline-none"
                autoFocus
              />
            </div>
            {overBalance && (
              <p className="mt-1 text-[11.5px] text-red-700">
                Exceeds the wallet balance.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Destination account
            </label>
            {accounts.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : verified.length === 0 && !adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-foundation-700/25 px-4 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                <Plus className="h-4 w-4" /> Add a verified bank account
              </button>
            ) : adding ? (
              <AddBankAccount
                onAdded={(acc) => {
                  setBankAccountId(acc._id);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <div className="space-y-2">
                {verified.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => setBankAccountId(a._id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                      bankAccountId === a._id
                        ? "border-foundation-700 bg-foundation-700/5"
                        : "border-foundation-700/15 hover:border-foundation-700/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foundation-700">
                        {a.bankName}
                      </p>
                      <p className="text-[11.5px] text-ink-muted">
                        {a.accountNumber} · {a.accountName}
                      </p>
                    </div>
                    {bankAccountId === a._id && (
                      <Check className="h-4 w-4 shrink-0 text-foundation-700" />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-[12px] font-semibold text-foundation-700 hover:underline"
                >
                  + Add another account
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="What's this withdrawal for?"
              className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-foundation-700/5 p-3 text-[11.5px] text-ink-muted">
            Your neighbours vote to approve this. Once it passes, the money is
            transferred to the selected account.
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || request.isPending}
            className="w-full rounded-full bg-foundation-700 px-5 py-3 text-[14px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {request.isPending ? "Requesting…" : "Request withdrawal"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddBankAccount({
  onAdded,
  onCancel,
}: {
  onAdded: (acc: TenantBankAccount) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const banks = useQuery({
    queryKey: ["me", "banks"],
    queryFn: () => tenantApi.listBanks(),
  });
  const bankName =
    banks.data?.find((b) => b.code === bankCode)?.name ?? "";

  const verify = useMutation({
    mutationFn: () => tenantApi.verifyBank({ accountNumber, bankCode }),
    onSuccess: (r) => {
      setResolved(r.accountName);
      setError(null);
    },
    onError: (err) => {
      setResolved(null);
      setError(errMsg(err));
    },
  });
  const add = useMutation({
    mutationFn: () =>
      tenantApi.addBankAccount({
        accountNumber,
        bankCode,
        bankName,
        accountName: resolved!,
      }),
    onSuccess: (acc) => {
      toast.success("Bank account added");
      onAdded(acc);
    },
    onError: (err) => setError(errMsg(err)),
  });

  const canVerify =
    bankCode.length > 0 && accountNumber.length >= 10 && !verify.isPending;

  return (
    <div className="space-y-3 rounded-2xl border border-foundation-700/15 p-4">
      <select
        value={bankCode}
        onChange={(e) => {
          setBankCode(e.target.value);
          setResolved(null);
        }}
        className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
      >
        <option value="">{banks.isLoading ? "Loading banks…" : "Select bank"}</option>
        {(banks.data ?? []).map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
      <input
        value={accountNumber}
        onChange={(e) => {
          setAccountNumber(e.target.value.replace(/[^0-9]/g, ""));
          setResolved(null);
        }}
        inputMode="numeric"
        maxLength={10}
        placeholder="Account number (10 digits)"
        className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
      />

      {resolved ? (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800">
          {resolved}
        </div>
      ) : null}
      {error && (
        <p className="text-[12px] text-red-700">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-foundation-700/15 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        {resolved ? (
          <button
            type="button"
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="flex-1 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {add.isPending ? "Saving…" : "Save account"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => verify.mutate()}
            disabled={!canVerify}
            className="flex-1 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {verify.isPending ? "Verifying…" : "Verify account"}
          </button>
        )}
      </div>
    </div>
  );
}

function errMsg(err: unknown): string {
  const ax = err as AxiosError<{ message?: string }>;
  return ax.response?.data?.message ?? (err as Error).message ?? "Something went wrong";
}

// Thin wrappers so the SSR build never trips on window globals.
function confirmWindow(msg: string): boolean {
  return typeof window !== "undefined" ? window.confirm(msg) : false;
}
function promptWindow(msg: string): string | null {
  return typeof window !== "undefined" ? window.prompt(msg) : null;
}
