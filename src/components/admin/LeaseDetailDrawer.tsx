"use client";

import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { Drawer } from "./ui/Drawer";
import { StatusBadge } from "./DataTable";
import { Skeleton } from "./ui/Skeleton";
import { formatDate, formatNgn } from "@/lib/format";

interface Props {
  leaseId: string | null;
  onClose: () => void;
}

export function LeaseDetailDrawer({ leaseId, onClose }: Props) {
  const open = !!leaseId;
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "lease", leaseId],
    queryFn: () => adminApi.getLeaseDetail(leaseId!),
    enabled: open,
  });

  const l = data?.lease;
  const propertyName = l?.property?.name ?? "Lease";
  const subtitle =
    l && l.tenant
      ? `${l.tenant.firstName ?? ""} ${l.tenant.lastName ?? ""}`.trim()
      : undefined;

  const fees: { label: string; value: number | undefined }[] = l
    ? [
        { label: "Security deposit", value: l.securityDeposit },
        { label: "Caution fee", value: l.cautionFee },
        { label: "Agent fee", value: l.agentFee },
        { label: "Agreement fee", value: l.agreementFee },
        { label: "Legal fee", value: l.legalFee },
        { label: "Service charge", value: l.serviceCharge },
        { label: "Other", value: l.otherFee },
      ]
    : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={propertyName}
      subtitle={subtitle}
      width="xl"
    >
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-canvas px-4 py-3 text-sm">
            <div>
              <p className="text-[11px] uppercase text-ink-muted">Status</p>
              <p className="mt-0.5"><StatusBadge value={l?.status} /></p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-ink-muted">Rent</p>
              <p className="text-foundation-700">
                {l ? formatNgn(l.rentAmount) : "—"}{" "}
                <span className="text-xs text-ink-muted">/ {l?.paymentFrequency}</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-ink-muted">Start</p>
              <p className="text-foundation-700">{formatDate(l?.startDate)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-ink-muted">End</p>
              <p className="text-foundation-700">{formatDate(l?.endDate)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="text-[11px] uppercase text-ink-muted">Tenant</p>
              <p className="mt-0.5 font-medium text-foundation-700">
                {l?.tenant
                  ? `${l.tenant.firstName ?? ""} ${l.tenant.lastName ?? ""}`.trim()
                  : "—"}
              </p>
              {l?.tenant && (
                <p className="text-xs text-ink-muted">{l.tenant.email}</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="text-[11px] uppercase text-ink-muted">Landlord</p>
              <p className="mt-0.5 font-medium text-foundation-700">
                {l?.landlord
                  ? `${l.landlord.firstName ?? ""} ${l.landlord.lastName ?? ""}`.trim()
                  : "—"}
              </p>
              {l?.landlord && (
                <p className="text-xs text-ink-muted">{l.landlord.email}</p>
              )}
            </div>
          </section>

          {fees.some((f) => (f.value ?? 0) > 0) && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                One-time fees
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-3">
                {fees
                  .filter((f) => (f.value ?? 0) > 0)
                  .map((f) => (
                    <div key={f.label}>
                      <p className="text-[11px] uppercase text-ink-muted">{f.label}</p>
                      <p className="text-foundation-700">{formatNgn(f.value ?? 0)}</p>
                    </div>
                  ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Transactions ({data.transactions.length})
            </h4>
            {data.transactions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center text-sm text-ink-muted">
                No transactions on this lease yet.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {data.transactions.map((t) => (
                  <div key={t._id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-foundation-700">
                        {formatNgn(t.amount)}{" "}
                        <span className="text-xs font-normal capitalize text-ink-muted">
                          · {t.type}
                        </span>
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(t.paymentDate ?? t.createdAt)}
                        {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={t.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
