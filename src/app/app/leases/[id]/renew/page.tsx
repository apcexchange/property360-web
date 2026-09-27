"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, LeasePayment } from "@/lib/landlord-api";

export default function RenewLeasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);
  const lease = row?.lease;
  const payments = useQuery({
    queryKey: ["lease-payments", id],
    queryFn: () => landlordApi.leasePayments(id) as Promise<LeasePayment[]>,
    enabled: !!lease,
  });

  const [newEndDate, setNewEndDate] = useState("");
  const [newRentAmount, setNewRentAmount] = useState<number | "">("");
  const [paymentId, setPaymentId] = useState("");

  // Default the new end date to current end + 12 months when lease loads.
  if (lease && !newEndDate) {
    const d = new Date(lease.endDate);
    d.setFullYear(d.getFullYear() + 1);
    setNewEndDate(d.toISOString().slice(0, 10));
  }
  if (lease && newRentAmount === "") {
    setNewRentAmount(lease.rentAmount);
  }

  const nextTermStart = lease ? new Date(lease.endDate) : null;
  if (nextTermStart) nextTermStart.setUTCDate(nextTermStart.getUTCDate() + 1);
  const renewalWindowStart = lease ? new Date(lease.endDate) : null;
  if (renewalWindowStart) renewalWindowStart.setUTCDate(renewalWindowStart.getUTCDate() - 90);
  const termRent = Number(newRentAmount || lease?.rentAmount || 0);
  const eligiblePayments = (payments.data ?? []).filter((payment) => {
    const paidAt = new Date(payment.paymentDate);
    return (
      payment.status === "completed" &&
      payment.appliedTo !== "renewal" &&
      payment.amount >= termRent &&
      !!renewalWindowStart &&
      paidAt >= renewalWindowStart
    );
  });

  const renew = useMutation({
    mutationFn: () =>
      landlordApi.renewLease(id, {
        newStartDate: nextTermStart?.toISOString().slice(0, 10) ?? "",
        newEndDate,
        rentAmount: termRent,
        paymentFrequency: lease?.paymentFrequency,
        paymentId: paymentId || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenants", "occupied-units"] }),
        queryClient.invalidateQueries({ queryKey: ["lease-payments", id] }),
      ]);
      router.push(`/app/leases/${id}`);
    },
  });

  const formError = (() => {
    if (!renew.isError) return null;
    const err = renew.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <AppTopbar
        title="Renew lease"
        subtitle={row ? `${row.tenant.firstName} ${row.tenant.lastName}` : undefined}
        actions={
          <Link
            href={`/app/leases/${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {!lease ? (
          <ErrorBox message="Lease not found." />
        ) : (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              renew.mutate();
            }}
          >
            <Card className="space-y-1 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Current lease
              </p>
              <p className="text-[14px] text-foundation-700">
                {formatDate(lease.startDate)} → {formatDate(lease.endDate)} ·{" "}
                {formatNgn(lease.rentAmount)}/{lease.paymentFrequency}
              </p>
              {nextTermStart && (
                <p className="pt-1 text-[12px] text-ink-muted">
                  New term starts {formatDate(nextTermStart.toISOString())}. The current lease remains active until then.
                </p>
              )}
            </Card>

            <Card className="space-y-3 p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Payment for the new term
                </p>
                <p className="mt-1 text-[13px] text-foundation-700">
                  If the tenant already paid the full rent, apply that payment here. We will mark it as covering this renewal and skip the next auto-invoice.
                </p>
              </div>
              {payments.isLoading ? (
                <p className="text-[12px] text-ink-muted">Checking payment history…</p>
              ) : eligiblePayments.length === 0 ? (
                <p className="rounded-xl bg-foundation-700/5 px-3 py-2.5 text-[12px] text-ink-muted">
                  No eligible full payment was found in the 90 days before this lease ends. Continue without one for an unpaid renewal, or record a current/part payment separately.
                </p>
              ) : (
                <div className="space-y-2">
                  {eligiblePayments.map((payment) => (
                    <label
                      key={payment._id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-foundation-700/10 p-3 transition has-[:checked]:border-lime-500 has-[:checked]:bg-lime-50"
                    >
                      <input
                        type="radio"
                        name="renewal-payment"
                        value={payment._id}
                        checked={paymentId === payment._id}
                        onChange={(e) => setPaymentId(e.target.value)}
                        className="mt-1 accent-foundation-700"
                      />
                      <span className="text-[13px] text-foundation-700">
                        <strong>{formatNgn(payment.amount)}</strong> received {formatDate(payment.paymentDate)}
                        <span className="block text-[11.5px] text-ink-muted">
                          Apply to {nextTermStart ? formatDate(nextTermStart.toISOString()) : "the next term"} → {formatDate(newEndDate)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Card>

            <Card className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  New end date
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  New rent (NGN), optional
                </label>
                <input
                  type="number"
                  value={String(newRentAmount)}
                  onChange={(e) =>
                    setNewRentAmount(
                      e.target.value === "" ? "" : Math.max(0, Number(e.target.value))
                    )
                  }
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
                <p className="mt-1 text-[11.5px] text-ink-muted">
                  Leave at current value to keep the existing rent.
                </p>
              </div>
            </Card>

            {formError && <ErrorBox message={formError} />}

            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/app/leases/${id}`}
                className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!newEndDate || renew.isPending}
                className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
              >
                {renew.isPending ? "Renewing…" : paymentId ? "Confirm paid renewal" : "Renew lease"}
              </button>
            </div>
          </form>
        )}
      </PageContainer>
    </>
  );
}
