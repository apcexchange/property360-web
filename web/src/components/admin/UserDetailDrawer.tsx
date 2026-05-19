"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { Drawer } from "./ui/Drawer";
import { Button } from "./ui/Filters";
import { StatusBadge } from "./DataTable";
import { Skeleton } from "./ui/Skeleton";
import { formatDate, formatNgn } from "@/lib/format";

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({ userId, onClose }: Props) {
  const qc = useQueryClient();
  const open = !!userId;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUserDetail(userId!),
    enabled: open,
  });

  const suspend = useMutation({
    mutationFn: () => adminApi.suspendUser(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const activate = useMutation({
    mutationFn: () => adminApi.activateUser(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const u = data?.user;
  const fullName = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
  const isAdmin = u?.role === "admin";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={fullName || "User"}
      subtitle={u ? `${u.email} · ${u.role}` : undefined}
      width="xl"
      footer={
        u && !isAdmin ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {u.isActive
                ? "Account is active and can sign in."
                : "Account is suspended and cannot sign in."}
            </span>
            {u.isActive ? (
              <Button
                variant="danger"
                size="sm"
                disabled={suspend.isPending}
                onClick={() => suspend.mutate()}
              >
                {suspend.isPending ? "Suspending…" : "Suspend account"}
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                disabled={activate.isPending}
                onClick={() => activate.mutate()}
              >
                {activate.isPending ? "Activating…" : "Activate account"}
              </Button>
            )}
          </div>
        ) : null
      }
    >
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile summary */}
          <section className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-canvas px-4 py-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">Phone</p>
              <p className="text-foundation-700">{u?.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">Joined</p>
              <p className="text-foundation-700">{formatDate(u?.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">KYC</p>
              <p className="text-foundation-700">
                <StatusBadge value={u?.kyc?.status} />
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">Account</p>
              <p className="text-foundation-700">
                {u?.isActive ? <StatusBadge value="active" /> : <StatusBadge value="dismissed" />}
              </p>
            </div>
            {u?.address?.city && (
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-ink-muted">Address</p>
                <p className="text-foundation-700">
                  {[u.address.street, u.address.city, u.address.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
          </section>

          {/* Activity counts */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Properties" value={data.stats.propertyCount} />
            <Stat label="Leases" value={data.stats.leaseCount} />
            <Stat label="Transactions" value={data.stats.transactionCount} />
            <Stat label="Paid out" value={formatNgn(data.stats.totalPaidOut)} />
          </section>

          {/* Wallet */}
          {data.wallet && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Wallet
              </h4>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase text-ink-muted">Balance</p>
                  <p className="text-base font-semibold text-foundation-700">
                    {formatNgn(data.wallet.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-ink-muted">Pending</p>
                  <p className="text-base font-semibold text-foundation-700">
                    {formatNgn(data.wallet.pendingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-ink-muted">Lifetime earnings</p>
                  <p className="text-foundation-700">{formatNgn(data.wallet.totalEarnings)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-ink-muted">Withdrawn</p>
                  <p className="text-foundation-700">{formatNgn(data.wallet.totalWithdrawn)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Recent leases */}
          {data.leases.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Recent leases ({data.leases.length})
              </h4>
              <div className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {data.leases.slice(0, 6).map((l) => (
                  <div key={l._id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foundation-700">
                        {l.property?.name ?? "—"}
                        {l.unit?.unitNumber ? ` · Unit ${l.unit.unitNumber}` : ""}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-foundation-700">
                        {formatNgn(l.rentAmount)}
                      </span>
                      <StatusBadge value={l.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent transactions */}
          {data.transactions.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Recent transactions ({data.transactions.length})
              </h4>
              <div className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {data.transactions.slice(0, 8).map((t) => (
                  <div key={t._id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foundation-700">
                        {formatNgn(t.amount)}{" "}
                        <span className="text-xs font-normal capitalize text-ink-muted">
                          · {t.type}
                        </span>
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(t.paymentDate ?? t.createdAt)}
                        {t.lease?.property?.name ? ` · ${t.lease.property.name}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={t.status} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.leases.length === 0 && data.transactions.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-canvas px-4 py-6 text-center text-sm text-ink-muted">
              No leases or transactions for this user yet.
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-foundation-700">{value}</p>
    </div>
  );
}
