"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  Plus,
  X,
  Droplet,
  Flame,
  Shield,
  Sparkles,
  Wrench,
  Receipt,
  ChevronRight,
  Wallet,
  Landmark,
} from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  EmptyState,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import {
  tenantApi,
  SharedBillSummary,
  SharedBillStatus,
  BillCategory,
} from "@/lib/tenant-api";

const CATEGORY_ICON: Record<
  BillCategory,
  React.ComponentType<{ className?: string }>
> = {
  water: Droplet,
  fuel: Flame,
  security: Shield,
  cleaning: Sparkles,
  repairs: Wrench,
  other: Receipt,
};

const CATEGORIES: { key: BillCategory; label: string }[] = [
  { key: "water", label: "Water" },
  { key: "fuel", label: "Fuel / power" },
  { key: "security", label: "Security" },
  { key: "cleaning", label: "Cleaning" },
  { key: "repairs", label: "Repairs" },
  { key: "other", label: "Other" },
];

const TABS: { key: SharedBillStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
  { key: "cancelled", label: "Cancelled" },
];

export default function SharedBillsPage() {
  const [tab, setTab] = useState<SharedBillStatus>("open");
  const [creating, setCreating] = useState(false);

  const dash = useQuery({
    queryKey: ["me", "dashboard"],
    queryFn: () => tenantApi.getDashboard(),
  });
  const propertyId = dash.data?.property?.id;

  const bills = useQuery({
    queryKey: ["me", "bills", propertyId, tab],
    queryFn: () => tenantApi.listSharedBills(propertyId!, tab),
    enabled: !!propertyId,
  });

  return (
    <>
      <TenantTopbar
        title="Shared bills"
        subtitle="Split building costs with your neighbours"
        actions={
          propertyId ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              <Plus className="h-4 w-4" /> New bill
            </button>
          ) : undefined
        }
      />
      <PageContainer>
        {dash.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : !propertyId ? (
          <EmptyState
            title="No active lease"
            body="Shared bills are for tenants in a building. Once you're assigned to a unit, you and your neighbours can split costs here."
          />
        ) : (
          <>
            <div className="mb-6 flex gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
                    tab === t.key
                      ? "bg-foundation-700 text-paper"
                      : "bg-foundation-700/5 text-foundation-700 hover:bg-foundation-700/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {bills.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </Card>
                ))}
              </div>
            ) : bills.isError ? (
              <ErrorBox
                message={(bills.error as Error)?.message}
                onRetry={() => bills.refetch()}
              />
            ) : (bills.data ?? []).length === 0 ? (
              <EmptyState
                title={`No ${tab} bills`}
                body={
                  tab === "open"
                    ? "Raise a shared bill and split it evenly across the building."
                    : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {bills.data!.map((b) => (
                  <BillRow key={b._id} bill={b} />
                ))}
              </div>
            )}
          </>
        )}
      </PageContainer>

      {creating && propertyId && (
        <CreateBillModal
          propertyId={propertyId}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function BillRow({ bill }: { bill: SharedBillSummary }) {
  const Icon = CATEGORY_ICON[bill.category] ?? Receipt;
  const tone: "good" | "warn" | "neutral" =
    bill.status === "settled"
      ? "good"
      : bill.status === "cancelled"
      ? "neutral"
      : "warn";
  return (
    <Link href={`/me/bills/${bill._id}`}>
      <Card className="flex items-center gap-4 p-4 transition hover:border-foundation-700/25">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foundation-700/5 text-foundation-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foundation-700">
            {bill.title}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {bill.creator.firstName} {bill.creator.lastName}
            {bill.escrowEnabled ? " · Group wallet" : ""} ·{" "}
            {formatDate(bill.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-bold text-foundation-700">
            {formatNgn(bill.totalAmount)}
          </p>
          <StatusPill label={bill.status} tone={tone} />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
      </Card>
    </Link>
  );
}

function CreateBillModal({
  propertyId,
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<BillCategory>("water");
  const [useEscrow, setUseEscrow] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(/[^0-9.]/g, ""));
  const bankComplete =
    accountName.trim() && accountNumber.trim() && bankName.trim();
  const canSubmit =
    numericAmount > 0 && title.trim().length > 0 && (useEscrow || bankComplete);

  const create = useMutation({
    mutationFn: () =>
      tenantApi.createSharedBill(propertyId, {
        title: title.trim(),
        category,
        totalAmount: numericAmount,
        useEscrow,
        bankDetails: useEscrow
          ? undefined
          : {
              accountName: accountName.trim(),
              accountNumber: accountNumber.trim(),
              bankName: bankName.trim(),
            },
      }),
    onSuccess: (detail) => {
      qc.invalidateQueries({ queryKey: ["me", "bills"] });
      toast.success("Bill posted");
      onClose();
      router.push(`/me/bills/${detail.bill._id}`);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? (err as Error).message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foundation-900/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-bold text-foundation-700">
            New shared bill
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
            if (canSubmit) create.mutate();
          }}
        >
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Amount
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-foundation-700/15 bg-surface px-4 py-3">
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
            <p className="mt-1.5 text-[11.5px] text-ink-muted">
              Split equally across everyone in your building.
            </p>
          </div>

          <Field label="What's this for?">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. June water bill"
              className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none"
            />
          </Field>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c.key];
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                      active
                        ? "bg-foundation-700 text-paper"
                        : "bg-foundation-700/5 text-foundation-700 hover:bg-foundation-700/10"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Where should payments go?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseEscrow(true)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                  useEscrow
                    ? "border-foundation-700 bg-foundation-700/5"
                    : "border-foundation-700/15 hover:border-foundation-700/30"
                }`}
              >
                <Wallet className="h-4 w-4 text-foundation-700" />
                <span className="text-[12.5px] font-semibold text-foundation-700">
                  Group wallet
                </span>
              </button>
              <button
                type="button"
                onClick={() => setUseEscrow(false)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                  !useEscrow
                    ? "border-foundation-700 bg-foundation-700/5"
                    : "border-foundation-700/15 hover:border-foundation-700/30"
                }`}
              >
                <Landmark className="h-4 w-4 text-foundation-700" />
                <span className="text-[12.5px] font-semibold text-foundation-700">
                  My bank
                </span>
              </button>
            </div>
            <p className="mt-1.5 text-[11.5px] text-ink-muted">
              {useEscrow
                ? "Neighbours pay into a secure shared wallet. Withdrawals need the group's approval."
                : "Neighbours transfer straight to your account; you confirm each payment yourself."}
            </p>
          </div>

          {!useEscrow && (
            <div className="space-y-3 rounded-2xl bg-foundation-700/5 p-4">
              <Field label="Account name">
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
                />
              </Field>
              <Field label="Account number">
                <input
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  inputMode="numeric"
                  className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
                />
              </Field>
              <Field label="Bank name">
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-surface px-3.5 py-2.5 text-[14px] text-foundation-700 focus:outline-none"
                />
              </Field>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || create.isPending}
            className="w-full rounded-full bg-foundation-700 px-5 py-3 text-[14px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            {create.isPending ? "Posting…" : "Post bill"}
          </button>
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
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
