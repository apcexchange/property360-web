"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, X } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  Card,
  EmptyState,
  ErrorBox,
  PageContainer,
  Skeleton,
  StatusPill,
  formatDate,
  formatNgn,
} from "@/components/app/ui";
import { landlordApi, PendingPayment } from "@/lib/landlord-api";

function paymentMethodLabel(method?: string) {
  if (!method) return "Payment";
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? (error as Error)?.message ?? fallback;
}

export default function PendingPaymentsPage() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<PendingPayment | null>(null);
  const [reason, setReason] = useState("");

  const payments = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => landlordApi.pendingPayments(),
  });
  const refreshPaymentData = () => {
    qc.invalidateQueries({ queryKey: ["pending-payments"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const confirm = useMutation({
    mutationFn: (id: string) => landlordApi.confirmPendingPayment(id),
    onSuccess: refreshPaymentData,
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      landlordApi.rejectPendingPayment(id, reason),
    onSuccess: () => {
      setRejecting(null);
      setReason("");
      refreshPaymentData();
    },
  });
  const actionError = confirm.isError
    ? errorMessage(confirm.error, "Couldn’t confirm this payment.")
    : reject.isError
    ? errorMessage(reject.error, "Couldn’t reject this payment.")
    : null;

  return (
    <>
      <AppTopbar
        title="Pending payments"
        subtitle="Review payments tenants have marked as paid"
      />
      <PageContainer>
        {actionError && <ErrorBox title="Payment not updated" message={actionError} />}
        {payments.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : payments.isError ? (
          <ErrorBox message={errorMessage(payments.error, "Couldn’t load pending payments.")} onRetry={() => payments.refetch()} />
        ) : payments.data?.length === 0 ? (
          <EmptyState
            title="No pending payments"
            body="When a tenant marks a payment as paid, it will appear here for your confirmation."
          />
        ) : (
          <div className="space-y-3">
            {payments.data?.map((payment) => {
              const tenantName = `${payment.tenant?.firstName ?? ""} ${payment.tenant?.lastName ?? ""}`.trim() || "Tenant";
              const place = [payment.property?.name, payment.unit?.unitNumber ? `Unit ${payment.unit.unitNumber}` : undefined].filter(Boolean).join(" · ");
              const busy = confirm.isPending || reject.isPending;
              return (
                <Card key={payment.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cryola-100 text-foundation-700"><CreditCard className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foundation-700">{tenantName}</p>
                        <p className="mt-0.5 text-[13px] text-ink-muted">{payment.description || "Payment"}{place ? ` · ${place}` : ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-ink-muted">
                          <StatusPill label={payment.type || "payment"} tone="warn" />
                          <span>{paymentMethodLabel(payment.paymentMethod)}</span>
                          <span>{formatDate(payment.paymentDate || payment.createdAt)}</span>
                          {payment.reference && <span>Ref: {payment.reference}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="font-amount text-[24px] font-extrabold tracking-[-0.02em] text-foundation-700">{formatNgn(payment.amount)}</p>
                  </div>
                  {payment.notes && <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-[12.5px] text-ink-muted">{payment.notes}</p>}
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-foundation-700/10 pt-4">
                    <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Confirm ${formatNgn(payment.amount)} from ${tenantName}?`)) confirm.mutate(payment.id); }} className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"><Check className="h-4 w-4" />{confirm.isPending ? "Confirming…" : "Confirm payment"}</button>
                    <button type="button" disabled={busy} onClick={() => { setRejecting(payment); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-paper px-4 py-2 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"><X className="h-4 w-4" />Reject</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-payment-title">
          <Card className="w-full max-w-md p-5 shadow-xl">
            <h2 id="reject-payment-title" className="font-display text-[20px] font-bold text-foundation-700">Reject payment</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Add an optional reason for the tenant.</p>
            <label className="mt-5 block text-[12px] font-semibold text-foundation-700">Reason</label>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Explain why this payment cannot be accepted" className="mt-1.5 w-full resize-y rounded-xl border border-foundation-700/15 bg-paper px-3 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={reject.isPending} onClick={() => setRejecting(null)} className="rounded-full border border-foundation-700/15 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={reject.isPending} onClick={() => reject.mutate({ id: rejecting.id, reason: reason.trim() || undefined })} className="rounded-full bg-red-600 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-red-700 disabled:opacity-50">{reject.isPending ? "Rejecting…" : "Reject payment"}</button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
