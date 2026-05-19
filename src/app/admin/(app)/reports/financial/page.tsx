"use client";

import { Topbar } from "@/components/admin/Topbar";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Select } from "@/components/admin/ui/Filters";
import { StatCard } from "@/components/admin/ui/StatCard";
import { Skeleton } from "@/components/admin/ui/Skeleton";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import { formatNgn, formatDate } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last 12 months" },
];

const FOUNDATION_700 = "#13272C";
const CRYOLA_500 = "#8AD148";

export default function AdminFinancialReportsPage() {
  const [range, setRange] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "financial-report", range],
    queryFn: () => adminApi.getFinancialReport(range),
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Financial reports"
            description="Platform revenue, payouts, and top landlords."
            filters={
              <Select value={String(range)} onChange={(v) => setRange(Number(v))}>
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`Revenue (${data?.rangeDays ?? range}d)`}
              value={data ? formatNgn(data.totals.revenue) : "—"}
              loading={isLoading}
              hint={data ? `${data.totals.revenueCount} payments` : undefined}
            />
            <StatCard
              label={`Payouts (${data?.rangeDays ?? range}d)`}
              value={data ? formatNgn(data.totals.payouts) : "—"}
              loading={isLoading}
              hint={data ? `${data.totals.payoutsCount} settled` : undefined}
            />
            <StatCard
              label="Net retained"
              value={
                data
                  ? formatNgn(Math.max(0, data.totals.revenue - data.totals.payouts))
                  : "—"
              }
              loading={isLoading}
              hint="revenue − payouts"
            />
            <StatCard
              label="Avg. payment"
              value={
                data && data.totals.revenueCount > 0
                  ? formatNgn(Math.round(data.totals.revenue / data.totals.revenueCount))
                  : "—"
              }
              loading={isLoading}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Revenue over time" description="Completed rent + deposit payments per day." />
              <CardBody className="h-72">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : !data?.revenueSeries.length ? (
                  <EmptyState title="No payments in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueSeries}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CRYOLA_500} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={CRYOLA_500} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E2E6E8" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#546881" }}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#546881" }}
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `₦${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1000
                              ? `₦${Math.round(v / 1000)}k`
                              : `₦${v}`
                        }
                      />
                      <Tooltip
                        formatter={(v) => [formatNgn(Number(v)), "Revenue"]}
                        labelFormatter={(label) => formatDate(String(label))}
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #E2E6E8",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={FOUNDATION_700}
                        strokeWidth={2}
                        fill="url(#rev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Status breakdown" description="All transactions in window, by outcome." />
              <CardBody>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : !data?.statusBreakdown.length ? (
                  <EmptyState title="No transactions in range" />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.statusBreakdown.map((s) => (
                      <li key={s._id} className="flex items-center justify-between">
                        <span className="capitalize text-foundation-700">{s._id}</span>
                        <span className="text-ink-muted">
                          {s.count} · {formatNgn(s.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader
              title="Top landlords by revenue"
              description="Highest-grossing landlords in the selected window."
            />
            <CardBody className="h-80">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : !data?.topLandlords.length ? (
                <EmptyState title="No revenue in this range" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topLandlords}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="#E2E6E8" strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#546881" }}
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : `₦${Math.round(v / 1000)}k`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="landlordName"
                      tick={{ fontSize: 12, fill: "#13272C" }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(v) => [formatNgn(Number(v)), "Revenue"]}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E2E6E8",
                      }}
                    />
                    <Bar dataKey="total" fill={FOUNDATION_700} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </>
  );
}
