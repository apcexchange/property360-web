"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { PageContainer, Card, ErrorBox, formatNgn } from "@/components/app/ui";
import { landlordApi, LeasePaymentMethod } from "@/lib/landlord-api";

export default function RecordPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<LeasePaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const record = useMutation({
    mutationFn: () =>
      landlordApi.recordLeasePayment(id, {
        amount,
        paymentDate,
        paymentMethod: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => router.push(`/app/leases/${id}`),
  });

  const formError = (() => {
    if (!record.isError) return null;
    const err = record.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit = amount > 0 && !!paymentDate;

  return (
    <>
      <AppTopbar
        title="Record payment"
        subtitle={
          row
            ? `${row.tenant.firstName} ${row.tenant.lastName} · ${row.property.name}, Unit ${row.unit.unitNumber}`
            : undefined
        }
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
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) record.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Amount (NGN)
                </label>
                <input
                  type="number"
                  value={String(amount)}
                  onChange={(e) =>
                    setAmount(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[18px] font-semibold text-foundation-700"
                />
                {row?.lease && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(row.lease!.rentAmount)}
                      className="rounded-full border border-foundation-700/15 bg-paper px-3 py-1 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                    >
                      One {row.lease.paymentFrequency} ·{" "}
                      {formatNgn(row.lease.rentAmount)}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Payment date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as LeasePaymentMethod)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paystack">Paystack</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Reference (optional)
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transfer reference / receipt #"
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              />
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
              disabled={!canSubmit || record.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {record.isPending ? "Saving…" : `Record ${formatNgn(amount)}`}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}
