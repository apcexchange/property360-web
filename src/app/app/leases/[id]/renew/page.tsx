"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { landlordApi } from "@/lib/landlord-api";

export default function RenewLeasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);
  const lease = row?.lease;

  const [newEndDate, setNewEndDate] = useState("");
  const [newRentAmount, setNewRentAmount] = useState<number | "">("");

  // Default the new end date to current end + 12 months when lease loads.
  if (lease && !newEndDate) {
    const d = new Date(lease.endDate);
    d.setFullYear(d.getFullYear() + 1);
    setNewEndDate(d.toISOString().slice(0, 10));
  }
  if (lease && newRentAmount === "") {
    setNewRentAmount(lease.rentAmount);
  }

  const renew = useMutation({
    mutationFn: () =>
      landlordApi.renewLease(id, {
        newEndDate,
        newRentAmount:
          newRentAmount === "" || newRentAmount === lease?.rentAmount
            ? undefined
            : Number(newRentAmount),
      }),
    onSuccess: () => router.push(`/app/leases/${id}`),
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
                {renew.isPending ? "Renewing…" : "Renew lease"}
              </button>
            </div>
          </form>
        )}
      </PageContainer>
    </>
  );
}
