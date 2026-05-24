"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, MapPin } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  EmptyState,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { tenantApi, LeaseInvitation } from "@/lib/tenant-api";

export default function InvitationsPage() {
  const q = useQuery({
    queryKey: ["me", "invitations"],
    queryFn: () => tenantApi.listInvitations(),
  });

  return (
    <>
      <TenantTopbar
        title="Invitations"
        subtitle="Lease offers waiting for your decision"
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No pending invitations"
            body="When a landlord invites you to a unit, it shows up here."
          />
        ) : (
          <div className="space-y-4">
            {q.data!.map((inv) => (
              <InvitationCard key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function InvitationCard({ inv }: { inv: LeaseInvitation }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const accept = useMutation({
    mutationFn: () => tenantApi.acceptInvitation(inv.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "invitations"] });
      qc.invalidateQueries({ queryKey: ["me", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["me", "payments", "summary"] });
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not accept"
      );
    },
  });

  const decline = useMutation({
    mutationFn: () => tenantApi.declineInvitation(inv.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "invitations"] });
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not decline"
      );
    },
  });

  const fees: Array<{ label: string; amount: number }> = [
    { label: "Security deposit", amount: inv.securityDeposit ?? 0 },
    { label: "Caution fee", amount: inv.cautionFee ?? 0 },
    { label: "Agent fee", amount: inv.agentFee ?? 0 },
    { label: "Agreement fee", amount: inv.agreementFee ?? 0 },
    { label: "Legal fee", amount: inv.legalFee ?? 0 },
    { label: "Service charge", amount: inv.serviceCharge ?? 0 },
    { label: inv.otherFeeDescription || "Other fee", amount: inv.otherFee ?? 0 },
  ].filter((f) => f.amount > 0);

  const totalUpfront =
    (inv.securityDeposit ?? 0) +
    (inv.cautionFee ?? 0) +
    (inv.agentFee ?? 0) +
    (inv.agreementFee ?? 0) +
    (inv.legalFee ?? 0) +
    (inv.serviceCharge ?? 0) +
    (inv.otherFee ?? 0);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-foundation-700/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[18px] font-extrabold text-foundation-700">
              {inv.property.name}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Unit {inv.unit.unitNumber}
              {inv.unit.bedrooms ? ` · ${inv.unit.bedrooms} bed` : ""}
              {inv.unit.bathrooms ? ` · ${inv.unit.bathrooms} bath` : ""}
            </p>
            {(inv.property.address?.city || inv.property.address?.state) && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                <MapPin className="h-3.5 w-3.5" />
                {[
                  inv.property.address?.street,
                  inv.property.address?.city,
                  inv.property.address?.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Rent
            </p>
            <p className="mt-1 font-display text-[18px] font-extrabold text-foundation-700">
              {formatNgn(inv.rentAmount)}
            </p>
            <p className="text-[11.5px] text-ink-muted">
              / {inv.paymentFrequency}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
          <KeyValue label="Lease start" value={formatDate(inv.startDate)} />
          <KeyValue label="Lease end" value={formatDate(inv.endDate)} />
          <KeyValue
            label="Landlord"
            value={`${inv.landlord.firstName} ${inv.landlord.lastName}`}
          />
        </div>

        {fees.length > 0 && (
          <div className="mt-4 rounded-xl bg-foundation-700/5 p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Upfront fees
            </p>
            <ul className="mt-2 space-y-1.5 text-[12.5px]">
              {fees.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center justify-between text-foundation-700"
                >
                  <span>{f.label}</span>
                  <span className="font-semibold">{formatNgn(f.amount)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-foundation-700/10 pt-2 text-[13px] font-semibold text-foundation-700">
                <span>Total</span>
                <span>{formatNgn(totalUpfront)}</span>
              </li>
            </ul>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 bg-foundation-700/5 p-4">
        {error && (
          <p className="mr-auto text-[12.5px] text-red-700">{error}</p>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            decline.mutate();
          }}
          disabled={decline.isPending || accept.isPending}
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
        >
          <X className="h-4 w-4" />{" "}
          {decline.isPending ? "Declining…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            accept.mutate();
          }}
          disabled={decline.isPending || accept.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />{" "}
          {accept.isPending ? "Accepting…" : "Accept invitation"}
        </button>
      </div>
    </Card>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-[13.5px] font-semibold text-foundation-700">
        {value}
      </p>
    </div>
  );
}
