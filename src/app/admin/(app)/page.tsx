"use client";

import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { StatCard } from "@/components/admin/ui/StatCard";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { Button, Select } from "@/components/admin/ui/Filters";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";
import { useState } from "react";

const RANGE_OPTIONS = [
  { value: 0, label: "All time" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 3 months" },
  { value: 180, label: "Last 6 months" },
  { value: 365, label: "Last 12 months" },
];

function getRangeLabel(days: number): string {
  const option = RANGE_OPTIONS.find((item) => item.value === days);
  return option?.label.replace("Last ", "") ?? `${days} days`;
}

function pctDelta(current?: number, previous?: number): number | undefined {
  if (
    typeof current !== "number" ||
    typeof previous !== "number" ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return undefined;
  }
  return ((current - previous) / previous) * 100;
}

function formatPct(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatCount(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-NG");
}

function todayDateline(): string {
  // "Thursday, May 15, 2026 · Lagos"
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(d)} · Lagos`;
}

export default function AdminDashboard() {
  const [range, setRange] = useState(30);
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats", range],
    queryFn: () => adminApi.getStats(range),
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ["admin", "transactions", { page: 1, limit: 6 }],
    queryFn: () => adminApi.listTransactions({ page: 1, limit: 6 }),
  });

  const rentDelta = stats
    ? pctDelta(stats.rentCollected, stats.rentCollectedPreviousPeriod)
    : undefined;
  const rangeLabel = getRangeLabel(stats?.rangeDays ?? range);

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            eyebrow={todayDateline()}
            title="The state of the desk."
            description="Live figures from the production API, rent received, payouts settled, occupancy held."
            filters={
              <Select
                aria-label="Dashboard date range"
                value={String(range)}
                onChange={(value) => setRange(Number(value))}
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            }
          />

          {/* Headline KPIs (with period delta where it makes sense) */}
          <div className="grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`Rent collected · ${rangeLabel}`}
              value={formatNgn(stats?.rentCollected)}
              loading={statsLoading}
              delta={rentDelta}
              hint={range === 0 ? "all completed rent + deposit payments" : `vs. prior ${rangeLabel}`}
            />
            <StatCard
              label={`Payouts · ${rangeLabel}`}
              value={formatNgn(stats?.payoutsCompleted)}
              loading={statsLoading}
              hint="settled to landlords"
            />
            <StatCard
              label="Active leases"
              value={formatCount(stats?.activeLeaseCount)}
              loading={statsLoading}
            />
            <StatCard
              label="Occupancy"
              value={formatPct(stats?.occupancyRate)}
              loading={statsLoading}
              hint={
                stats &&
                typeof stats.occupiedUnitCount === "number" &&
                typeof stats.unitCount === "number"
                  ? `${stats.occupiedUnitCount} of ${stats.unitCount} units`
                  : undefined
              }
            />
          </div>

          {/* People & inventory, secondary register */}
          <section className="mt-10">
            <h3 className="mb-4 flex items-baseline gap-3">
              <span aria-hidden className="h-3 w-[3px] bg-cryola-400" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-foundation-700">
                Section II
              </span>
              <span className="font-display text-[20px] font-medium tracking-[-0.015em] text-foundation-700">
                People &amp; inventory
              </span>
              <span className="h-px flex-1 bg-foundation-700/25" />
            </h3>
            <div className="grid grid-cols-2 gap-px overflow-hidden bg-rule lg:grid-cols-4">
              <StatCard label="Landlords" value={formatCount(stats?.landlordCount)} loading={statsLoading} />
              <StatCard label="Tenants" value={formatCount(stats?.tenantCount)} loading={statsLoading} />
              <StatCard label="Agents" value={formatCount(stats?.agentCount)} loading={statsLoading} />
              <StatCard label="Properties" value={formatCount(stats?.propertyCount)} loading={statsLoading} />
            </div>
          </section>

          {/* Compliance queue: only render when there's something to act on */}
          {(() => {
            const kyc = stats?.pendingKycCount ?? 0;
            const reports = stats?.pendingReportCount ?? 0;
            const deletions = stats?.pendingDeletionCount ?? 0;
            if (kyc + reports + deletions === 0) return null;
            return (
              <section className="mt-10">
                <h3 className="mb-4 flex items-baseline gap-3">
                  <span aria-hidden className="h-3 w-[3px] bg-cryola-400" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-foundation-700">
                    Section III
                  </span>
                  <span className="font-display text-[20px] font-medium tracking-[-0.015em] text-foundation-700">
                    Awaiting your judgement
                  </span>
                  <span className="h-px flex-1 bg-foundation-700/25" />
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {kyc > 0 && (
                    <QueueAlert
                      href="/admin/kyc"
                      label="KYC submissions"
                      count={kyc}
                      cta="Review"
                    />
                  )}
                  {reports > 0 && (
                    <QueueAlert
                      href="/admin/reports"
                      label="Moderation reports"
                      count={reports}
                      cta="Open queue"
                    />
                  )}
                  {deletions > 0 && (
                    <QueueAlert
                      href="/admin/deletion-requests"
                      label="Deletion requests"
                      count={deletions}
                      cta="Process"
                    />
                  )}
                </div>
              </section>
            );
          })()}

          <section className="mt-10">
            <Card>
              <CardHeader
                title="Recent transactions"
                description="The six most recent payments across the platform."
                action={
                  <Link href="/admin/transactions">
                    <Button size="sm" variant="ghost">
                      View all →
                    </Button>
                  </Link>
                }
              />
              <DataTable
                loading={recentLoading}
                rows={recent?.items ?? []}
                empty="No transactions yet."
                columns={[
                  {
                    key: "paymentDate",
                    header: "Date",
                    render: (r) => (
                      <span className="font-mono text-[12.5px] text-ink-muted tabular">
                        {formatDate(r.paymentDate ?? r.createdAt)}
                      </span>
                    ),
                  },
                  {
                    key: "tenant",
                    header: "Tenant",
                    render: (r) =>
                      r.tenant ? (
                        <span className="font-display text-[14.5px] text-ink">
                          {`${r.tenant.firstName ?? ""} ${r.tenant.lastName ?? ""}`.trim()}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      ),
                  },
                  {
                    key: "property",
                    header: "Property",
                    render: (r) => r.lease?.property?.name ?? <span className="text-ink-faint">—</span>,
                  },
                  {
                    key: "type",
                    header: "Type",
                    render: (r) => (
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {r.type}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    className: "text-right",
                    render: (r) => (
                      <span className="font-mono text-[13.5px] font-medium text-ink tabular">
                        {formatNgn(r.amount)}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => <StatusBadge value={r.status} />,
                  },
                ]}
              />
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}

function QueueAlert({
  href,
  label,
  count,
  cta,
}: {
  href: string;
  label: string;
  count: number;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-end justify-between gap-4 border border-foundation-700/25 bg-surface px-5 py-4 transition-colors hover:bg-cryola-50/70"
    >
      {/* Brand spine + lime tip */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-foundation-700" />
      <span aria-hidden className="absolute left-0 top-0 h-3 w-[3px] bg-cryola-400" />
      <div className="min-w-0 pl-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700">
          Pending review
        </p>
        <p className="mt-1.5 font-display text-[14.5px] italic text-ink-muted">
          {label.toLowerCase()}
        </p>
      </div>
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-display text-[28px] font-medium leading-none tracking-[-0.025em] text-foundation-700 tabular">
          {count}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foundation-700 group-hover:underline">
          {cta} →
        </span>
      </div>
    </Link>
  );
}
