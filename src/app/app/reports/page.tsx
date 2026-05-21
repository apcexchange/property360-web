"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatCard,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  ReportPeriod,
  ReportSummary,
  BalanceSheet,
  CashFlow,
  CategoryTotal,
  MonthlyBucket,
  CashFlowMonth,
  Property,
} from "@/lib/landlord-api";

const FOUNDATION = "#1F414A";
const CRYOLA = "#22C55E";
const EXPENSE_RED = "#DC2626";
const INCOME_PALETTE = ["#16A34A", "#22C55E", "#65A30D", "#84CC16"];
const EXPENSE_PALETTE = ["#DC2626", "#EF4444", "#F97316", "#B91C1C"];

function compactNgn(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n}`;
}

function tooltipFormatNgn(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? formatNgn(n) : String(value ?? "");
}

const PERIOD_OPTIONS: Array<{ label: string; value: ReportPeriod }> = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
  { label: "Last year", value: "last_year" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("this_year");
  const [propertyId, setPropertyId] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const useCustom = Boolean(from && to);
  const summaryParams = useMemo(
    () => ({
      period: useCustom ? undefined : period,
      from: useCustom ? from : undefined,
      to: useCustom ? to : undefined,
      propertyId: propertyId || undefined,
    }),
    [period, from, to, propertyId, useCustom]
  );
  const cashFlowParams = useMemo(
    () => ({
      period: useCustom ? undefined : period,
      from: useCustom ? from : undefined,
      to: useCustom ? to : undefined,
      propertyId: propertyId || undefined,
    }),
    [period, from, to, propertyId, useCustom]
  );

  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const summary = useQuery({
    queryKey: ["reports", "summary", summaryParams],
    queryFn: () => landlordApi.getReportSummary(summaryParams),
  });

  const balanceSheet = useQuery({
    queryKey: ["reports", "balance-sheet"],
    queryFn: () => landlordApi.getBalanceSheet(),
  });

  const cashFlow = useQuery({
    queryKey: ["reports", "cash-flow", cashFlowParams],
    queryFn: () => landlordApi.getCashFlow(cashFlowParams),
  });

  async function download(format: "csv" | "pdf") {
    try {
      setDownloading(format);
      const blob = await landlordApi.downloadReportSummary(format, summaryParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = useCustom ? "custom" : period;
      a.download = `property360-report-${label}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <AppTopbar
        title="Reports"
        subtitle="Income, balance sheet, and cash flow"
      />
      <PageContainer>
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Period
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PERIOD_OPTIONS.map((opt) => {
                  const active = !useCustom && period === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPeriod(opt.value);
                        setFrom("");
                        setTo("");
                      }}
                      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                        active
                          ? "bg-foundation-700 text-paper"
                          : "border border-foundation-700/10 bg-paper text-foundation-700 hover:bg-foundation-700/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-foundation-700/10 bg-paper px-2 py-1.5 text-[13px] text-foundation-700 focus:border-foundation-700/30 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-foundation-700/10 bg-paper px-2 py-1.5 text-[13px] text-foundation-700 focus:border-foundation-700/30 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Property
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="rounded-lg border border-foundation-700/10 bg-paper px-2 py-1.5 text-[13px] text-foundation-700 focus:border-foundation-700/30 focus:outline-none"
              >
                <option value="">All properties</option>
                {(properties.data ?? []).map((p: Property) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {(from || to || propertyId) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setPropertyId("");
                }}
                className="text-[12px] font-semibold text-foundation-700 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        <SummarySection
          summary={summary.data}
          isLoading={summary.isLoading}
          isError={summary.isError}
          error={summary.error as Error | undefined}
          onRetry={() => summary.refetch()}
          onDownload={download}
          downloading={downloading}
        />

        <BalanceSheetSection
          balanceSheet={balanceSheet.data}
          isLoading={balanceSheet.isLoading}
          isError={balanceSheet.isError}
          error={balanceSheet.error as Error | undefined}
          onRetry={() => balanceSheet.refetch()}
          propertySelected={Boolean(propertyId)}
        />

        <CashFlowSection
          cashFlow={cashFlow.data}
          isLoading={cashFlow.isLoading}
          isError={cashFlow.isError}
          error={cashFlow.error as Error | undefined}
          onRetry={() => cashFlow.refetch()}
        />
      </PageContainer>
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[18px] font-extrabold tracking-[-0.01em] text-foundation-700">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

function SummarySection({
  summary,
  isLoading,
  isError,
  error,
  onRetry,
  onDownload,
  downloading,
}: {
  summary?: ReportSummary;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  onRetry: () => void;
  onDownload: (format: "csv" | "pdf") => void;
  downloading: "csv" | "pdf" | null;
}) {
  return (
    <section>
      <SectionHeader
        title="Summary"
        subtitle={summary?.period.label}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload("csv")}
              disabled={!summary || downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-3.5 py-1.5 text-[12px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />{" "}
              {downloading === "csv" ? "Preparing…" : "CSV"}
            </button>
            <button
              type="button"
              onClick={() => onDownload("pdf")}
              disabled={!summary || downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-3.5 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-foundation-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />{" "}
              {downloading === "pdf" ? "Preparing…" : "PDF"}
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : isError || !summary ? (
        <ErrorBox message={error?.message} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Income" value={formatNgn(summary.income.total)} />
            <StatCard label="Expense" value={formatNgn(summary.expense.total)} />
            <StatCard
              label="Net profit"
              value={
                <span
                  className={
                    summary.netProfit >= 0 ? "text-emerald-700" : "text-red-700"
                  }
                >
                  {formatNgn(summary.netProfit)}
                </span>
              }
            />
            <StatCard
              label="Transactions"
              value={summary.transactionCount.toString()}
            />
          </div>

          <MonthlyChart monthly={summary.monthly} />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CategoryBlock
              title="Income by category"
              items={summary.income.byCategory}
              total={summary.income.total}
              palette={INCOME_PALETTE}
              tone="good"
            />
            <CategoryBlock
              title="Expense by category"
              items={summary.expense.byCategory}
              total={summary.expense.total}
              palette={EXPENSE_PALETTE}
              tone="bad"
            />
          </div>

          <MonthlyBars monthly={summary.monthly} />
        </>
      )}
    </section>
  );
}

function CategoryBlock({
  title,
  items,
  total,
  palette,
  tone,
}: {
  title: string;
  items: CategoryTotal[];
  total: number;
  palette: string[];
  tone: "good" | "bad";
}) {
  const accent = tone === "good" ? "text-emerald-700" : "text-red-700";
  const hasData = items.length > 0 && total > 0;
  return (
    <Card className="p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {title}
      </h3>
      {!hasData ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          Nothing recorded for this period.
        </p>
      ) : (
        <>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {items.map((cat, i) => (
                    <Cell key={cat.key} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={tooltipFormatNgn}
                  contentStyle={{
                    border: "1px solid rgba(31,65,74,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 divide-y divide-foundation-700/10">
            {items.map((cat, i) => {
              const pct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
              return (
                <li
                  key={cat.key}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: palette[i % palette.length] }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-foundation-700">
                        {cat.label}
                      </p>
                      <p className="text-[11.5px] text-ink-muted">
                        {pct}% of total
                      </p>
                    </div>
                  </div>
                  <p className={`text-[14px] font-semibold ${accent}`}>
                    {formatNgn(cat.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-foundation-700/10 pt-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Total
        </span>
        <span className={`text-[15px] font-bold ${accent}`}>
          {formatNgn(total)}
        </span>
      </div>
    </Card>
  );
}

function MonthlyChart({ monthly }: { monthly: MonthlyBucket[] }) {
  if (monthly.length === 0) return null;
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Income vs expense
        </h3>
      </div>
      <div className="px-3 pb-3 pt-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthly}
            margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          >
            <CartesianGrid stroke="rgba(31,65,74,0.08)" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(31,65,74,0.1)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactNgn}
              width={56}
            />
            <Tooltip
              formatter={tooltipFormatNgn}
              cursor={{ fill: "rgba(31,65,74,0.04)" }}
              contentStyle={{
                border: "1px solid rgba(31,65,74,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
              iconType="circle"
            />
            <Bar
              dataKey="income"
              name="Income"
              fill={CRYOLA}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="expense"
              name="Expense"
              fill={EXPENSE_RED}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function MonthlyBars({ monthly }: { monthly: MonthlyBucket[] }) {
  const max = Math.max(
    1,
    ...monthly.map((m) => Math.max(m.income, m.expense))
  );
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-3">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Monthly breakdown (table)
        </h3>
      </div>
      {monthly.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-ink-muted">
          No months in this range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-foundation-700/5 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Month
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Income
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Expense
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                  Net
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foundation-700/10">
              {monthly.map((m) => (
                <tr key={m.monthKey}>
                  <td className="whitespace-nowrap px-5 py-2.5 font-medium text-foundation-700">
                    {m.monthLabel}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-foundation-700/5">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(m.income / max) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[12px] text-foundation-700">
                        {formatNgn(m.income)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-foundation-700/5">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${(m.expense / max) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[12px] text-foundation-700">
                        {formatNgn(m.expense)}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-2.5 text-right font-semibold ${
                      m.net >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {formatNgn(m.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BalanceSheetSection({
  balanceSheet,
  isLoading,
  isError,
  error,
  onRetry,
  propertySelected,
}: {
  balanceSheet?: BalanceSheet;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  onRetry: () => void;
  propertySelected: boolean;
}) {
  return (
    <section>
      <SectionHeader
        title="Balance sheet"
        subtitle={
          balanceSheet ? `As of ${formatDate(balanceSheet.asOf)}` : undefined
        }
      />
      {propertySelected && (
        <p className="mb-3 rounded-lg border border-foundation-700/10 bg-foundation-700/5 px-3 py-2 text-[12px] text-foundation-700">
          Balance sheet is portfolio-wide — property filter doesn&apos;t apply
          here.
        </p>
      )}
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-40" />
              <Skeleton className="mt-2 h-6 w-32" />
              <Skeleton className="mt-2 h-6 w-36" />
            </Card>
          ))}
        </div>
      ) : isError || !balanceSheet ? (
        <ErrorBox message={error?.message} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Assets
              </h3>
              <BalanceRow
                label="Wallet balance"
                value={formatNgn(balanceSheet.assets.walletBalance)}
              />
              <BalanceRow
                label="Rent receivable"
                value={formatNgn(balanceSheet.assets.rentReceivable)}
              />
              <BalanceRow
                label="Property value"
                value={formatNgn(balanceSheet.assets.propertyValueTotal)}
              />
              <BalanceRow
                label="Total"
                value={formatNgn(balanceSheet.assets.total)}
                emphasize
              />
            </Card>
            <Card className="p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Liabilities
              </h3>
              <BalanceRow
                label="Deposits held"
                value={formatNgn(balanceSheet.liabilities.depositsHeld)}
              />
              <BalanceRow
                label="Pending payouts"
                value={formatNgn(balanceSheet.liabilities.pendingPayouts)}
              />
              <BalanceRow
                label="Total"
                value={formatNgn(balanceSheet.liabilities.total)}
                emphasize
              />
            </Card>
          </div>

          <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Equity
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">
                Assets minus liabilities
              </p>
            </div>
            <p
              className={`font-display text-[28px] font-extrabold leading-none tracking-[-0.02em] ${
                balanceSheet.equity >= 0 ? "text-foundation-700" : "text-red-700"
              }`}
            >
              {formatNgn(balanceSheet.equity)}
            </p>
          </Card>

          <p className="mt-3 text-[12px] text-ink-muted">
            {balanceSheet.meta.propertyCount} propert
            {balanceSheet.meta.propertyCount === 1 ? "y" : "ies"} ·{" "}
            {balanceSheet.meta.propertiesWithValue} with valuation ·{" "}
            {balanceSheet.meta.openInvoiceCount} open invoice
            {balanceSheet.meta.openInvoiceCount === 1 ? "" : "s"}
          </p>
        </>
      )}
    </section>
  );
}

function BalanceRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 ${
        emphasize ? "mt-2 border-t border-foundation-700/10 pt-3" : ""
      }`}
    >
      <span
        className={`text-[13.5px] ${
          emphasize
            ? "font-semibold text-foundation-700"
            : "text-foundation-700"
        }`}
      >
        {label}
      </span>
      <span
        className={`${
          emphasize ? "text-[15px] font-bold" : "text-[14px] font-semibold"
        } text-foundation-700`}
      >
        {value}
      </span>
    </div>
  );
}

function CashFlowSection({
  cashFlow,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  cashFlow?: CashFlow;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  onRetry: () => void;
}) {
  return (
    <section>
      <SectionHeader title="Cash flow" subtitle={cashFlow?.period.label} />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : isError || !cashFlow ? (
        <ErrorBox message={error?.message} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Inflow" value={formatNgn(cashFlow.totals.inflow)} />
            <StatCard
              label="Outflow"
              value={formatNgn(cashFlow.totals.outflow)}
            />
            <StatCard
              label="Net"
              value={
                <span
                  className={
                    cashFlow.totals.net >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }
                >
                  {formatNgn(cashFlow.totals.net)}
                </span>
              }
            />
          </div>
          <CashFlowChart monthly={cashFlow.monthly} />
          <CashFlowTable monthly={cashFlow.monthly} />
        </>
      )}
    </section>
  );
}

function CashFlowChart({ monthly }: { monthly: CashFlowMonth[] }) {
  if (monthly.length === 0) return null;
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Cash flow trend
        </h3>
      </div>
      <div className="px-3 pb-3 pt-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={monthly}
            margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          >
            <CartesianGrid stroke="rgba(31,65,74,0.08)" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(31,65,74,0.1)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactNgn}
              width={56}
            />
            <Tooltip
              formatter={tooltipFormatNgn}
              cursor={{ fill: "rgba(31,65,74,0.04)" }}
              contentStyle={{
                border: "1px solid rgba(31,65,74,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
              iconType="circle"
            />
            <Bar
              dataKey="inflow"
              name="Inflow"
              fill={CRYOLA}
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="outflow"
              name="Outflow"
              fill={EXPENSE_RED}
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
            <Line
              dataKey="runningBalance"
              name="Running balance"
              type="monotone"
              stroke={FOUNDATION}
              strokeWidth={2}
              dot={{ r: 3, fill: FOUNDATION }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CashFlowTable({ monthly }: { monthly: CashFlowMonth[] }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-3">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Monthly cash flow (table)
        </h3>
      </div>
      {monthly.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-ink-muted">
          No months in this range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-foundation-700/5 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Month
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Inflow
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Outflow
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Net
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                  Running balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foundation-700/10">
              {monthly.map((m) => (
                <tr key={m.monthKey}>
                  <td className="whitespace-nowrap px-5 py-2.5 font-medium text-foundation-700">
                    {m.monthLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-emerald-700">
                    {formatNgn(m.inflow)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-red-700">
                    {formatNgn(m.outflow)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold ${
                      m.net >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {formatNgn(m.net)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-2.5 text-right font-semibold ${
                      m.runningBalance >= 0
                        ? "text-foundation-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatNgn(m.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
