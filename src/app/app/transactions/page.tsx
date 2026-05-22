"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  LandlordTransaction,
  Property,
  WalletTransaction,
} from "@/lib/landlord-api";

const FOUNDATION = "#1F414A";

function tooltipFormatNgn(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? formatNgn(n) : String(value ?? "");
}

type SourceFilter = "all" | "rent" | "wallet";
type DirectionFilter = "all" | "in" | "out";
type UnifiedStatus = "completed" | "pending" | "failed" | "voided";
type StatusFilter = "all" | UnifiedStatus;

/**
 * Unified shape we render in the list and use to drive filters /
 * chart / CSV. Wallet credits and every rent row count as "in";
 * wallet debits / withdrawals are "out".
 */
type Row = {
  id: string;
  source: "rent" | "wallet";
  direction: "in" | "out";
  amount: number;
  status: UnifiedStatus;
  date: string;
  /** Sortable timestamp (ms). */
  ts: number;
  /** Single-line description used in the row's primary slot. */
  primaryLabel: string;
  /** Secondary line — tenant + property/unit for rent, reference for wallet. */
  secondaryLabel?: string;
  reference?: string;
  // Rent-specific extras kept so CSV export can write them.
  tenantName?: string;
  propertyName?: string;
  unitNumber?: string;
  paymentMethod?: string;
  type?: string;
};

const SOURCE_TONE: Record<Row["source"], "info" | "neutral"> = {
  rent: "info",
  wallet: "neutral",
};

const STATUS_TONE: Record<UnifiedStatus, "good" | "warn" | "bad"> = {
  completed: "good",
  pending: "warn",
  failed: "bad",
  voided: "bad",
};

const SOURCE_LABEL: Record<Row["source"], string> = {
  rent: "Rent",
  wallet: "Wallet",
};

function prettyMethod(m?: string): string {
  if (!m) return "";
  return m
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function tenantName(t: LandlordTransaction["tenant"]): string | undefined {
  if (!t) return undefined;
  const full = `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim();
  return full || undefined;
}

function rentDescription(t: LandlordTransaction): string {
  const verb =
    t.type === "deposit"
      ? "Deposit"
      : t.type === "maintenance"
      ? "Maintenance"
      : t.type === "other"
      ? "Other payment"
      : "Rent";
  const tn = tenantName(t.tenant);
  return tn ? `${verb} from ${tn}` : verb;
}

function rentToRow(t: LandlordTransaction): Row {
  const propertyName = t.lease?.property?.name;
  const unitNumber = t.lease?.unit?.unitNumber;
  const secondaryParts: string[] = [];
  if (propertyName) secondaryParts.push(propertyName);
  if (unitNumber) secondaryParts.push(`Unit ${unitNumber}`);
  if (t.paymentMethod) secondaryParts.push(prettyMethod(t.paymentMethod));
  const date = t.paymentDate ?? t.createdAt;
  return {
    id: `rent:${t._id}`,
    source: "rent",
    direction: "in",
    amount: t.amount,
    status: t.status as UnifiedStatus,
    date,
    ts: new Date(date).getTime(),
    primaryLabel: rentDescription(t),
    secondaryLabel: secondaryParts.join(" · "),
    reference: t.reference,
    tenantName: tenantName(t.tenant),
    propertyName,
    unitNumber,
    paymentMethod: t.paymentMethod,
    type: t.type,
  };
}

function walletToRow(w: WalletTransaction): Row {
  return {
    id: `wallet:${w._id}`,
    source: "wallet",
    direction: w.type === "credit" ? "in" : "out",
    amount: w.amount,
    // WalletTransaction.status is the same string union as
    // UnifiedStatus minus 'voided'; treat it as the same type.
    status: w.status as UnifiedStatus,
    date: w.createdAt,
    ts: new Date(w.createdAt).getTime(),
    primaryLabel: w.description ?? (w.type === "credit" ? "Wallet credit" : "Wallet debit"),
    secondaryLabel: w.reference,
    reference: w.reference,
  };
}

function toCsv(rows: Row[]): string {
  const escape = (v: unknown): string => {
    const s = v === undefined || v === null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = [
    "Date",
    "Source",
    "Direction",
    "Status",
    "Amount (NGN)",
    "Tenant",
    "Property",
    "Unit",
    "Payment method",
    "Reference",
    "Description",
  ];
  const lines = rows.map((r) =>
    [
      new Date(r.date).toISOString().slice(0, 10),
      SOURCE_LABEL[r.source],
      r.direction === "in" ? "In" : "Out",
      r.status,
      r.amount,
      r.tenantName ?? "",
      r.propertyName ?? "",
      r.unitNumber ?? "",
      r.paymentMethod ? prettyMethod(r.paymentMethod) : "",
      r.reference ?? "",
      r.primaryLabel,
    ]
      .map(escape)
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export default function TransactionsPage() {
  const [source, setSource] = useState<SourceFilter>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState<string>("");

  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const rentQ = useQuery({
    queryKey: ["transactions", "rent", propertyId || "all"],
    queryFn: () =>
      landlordApi.transactions(propertyId ? { propertyId } : undefined),
  });
  const walletQ = useQuery({
    queryKey: ["wallet", "transactions", propertyId || "all"],
    queryFn: () =>
      landlordApi.walletTransactions(propertyId ? { propertyId } : undefined),
  });

  const merged = useMemo<Row[]>(() => {
    const r = (rentQ.data ?? []).map(rentToRow);
    const w = (walletQ.data ?? []).map(walletToRow);
    return [...r, ...w].sort((a, b) => b.ts - a.ts);
  }, [rentQ.data, walletQ.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return merged.filter((r) => {
      if (source !== "all" && r.source !== source) return false;
      if (direction !== "all" && r.direction !== direction) return false;
      if (status !== "all" && r.status !== status) return false;
      if (fromTs !== null && r.ts < fromTs) return false;
      if (toTs !== null && r.ts > toTs) return false;
      if (term) {
        const haystack = [
          r.primaryLabel,
          r.secondaryLabel ?? "",
          r.reference ?? "",
          r.tenantName ?? "",
          r.propertyName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [merged, source, direction, status, from, to, search]);

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const r of filtered) {
      if (r.status !== "completed") continue;
      if (r.direction === "in") inflow += r.amount;
      else outflow += r.amount;
    }
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: filtered.length,
    };
  }, [filtered]);

  // Day-bucketed net flow for the inline area chart. Buckets are local
  // calendar days; only completed rows contribute so pending entries
  // don't skew the trend.
  const netFlowSeries = useMemo(() => {
    const buckets = new Map<string, { day: string; net: number; sortKey: number }>();
    for (const r of filtered) {
      if (r.status !== "completed") continue;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      const signed = r.direction === "in" ? r.amount : -r.amount;
      const existing = buckets.get(key);
      if (existing) existing.net += signed;
      else
        buckets.set(key, {
          day: key,
          net: signed,
          sortKey: new Date(`${key}T00:00:00`).getTime(),
        });
    }
    const ordered = Array.from(buckets.values()).sort(
      (a, b) => a.sortKey - b.sortKey
    );
    const recent = ordered.slice(-30);
    return recent.map((b) => ({
      day: b.day,
      label: new Date(`${b.day}T00:00:00`).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      }),
      net: b.net,
    }));
  }, [filtered]);

  function exportCsv() {
    if (filtered.length === 0) return;
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `property360-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const loading = rentQ.isLoading || walletQ.isLoading;
  const error = rentQ.error ?? walletQ.error;
  const isError = rentQ.isError || walletQ.isError;
  const isEmpty = merged.length === 0;

  return (
    <>
      <AppTopbar
        title="Transactions"
        subtitle="Rent payments and wallet activity"
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <PageContainer>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Showing" value={`${totals.count}`} />
          <SummaryStat
            label="Inflow"
            value={formatNgn(totals.inflow)}
            tone="good"
          />
          <SummaryStat
            label="Outflow"
            value={formatNgn(totals.outflow)}
            tone="neutral"
          />
          <SummaryStat
            label="Net"
            value={formatNgn(totals.net)}
            tone={totals.net >= 0 ? "good" : "bad"}
          />
        </div>

        <Card className="mt-6 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <PillGroup
              label="Source"
              value={source}
              onChange={(v) => setSource(v as SourceFilter)}
              options={[
                { label: "All", value: "all" },
                { label: "Rent", value: "rent" },
                { label: "Wallet", value: "wallet" },
              ]}
            />
            <PillGroup
              label="Direction"
              value={direction}
              onChange={(v) => setDirection(v as DirectionFilter)}
              options={[
                { label: "All", value: "all" },
                { label: "In", value: "in" },
                { label: "Out", value: "out" },
              ]}
            />
            <PillGroup
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { label: "All", value: "all" },
                { label: "Completed", value: "completed" },
                { label: "Pending", value: "pending" },
                { label: "Failed", value: "failed" },
                { label: "Voided", value: "voided" },
              ]}
            />
            <DateField label="From" value={from} onChange={setFrom} />
            <DateField label="To" value={to} onChange={setTo} />
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
            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tenant, property, reference"
                  className="w-full rounded-lg border border-foundation-700/10 bg-paper py-1.5 pl-7 pr-2 text-[13px] text-foundation-700 placeholder:text-ink-muted focus:border-foundation-700/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>

        <NetFlowChart series={netFlowSeries} />

        <div className="mt-6">
          {loading ? (
            <Card className="divide-y divide-foundation-700/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </Card>
          ) : isError ? (
            <ErrorBox
              message={(error as Error)?.message}
              onRetry={() => {
                rentQ.refetch();
                walletQ.refetch();
              }}
            />
          ) : isEmpty ? (
            <EmptyState
              title="No transactions yet"
              body="Once you record a payment or a tenant pays via Paystack, the entries land here."
            />
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-ink-muted">
              No transactions match the current filters.
            </Card>
          ) : (
            <Card className="divide-y divide-foundation-700/10">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-medium text-foundation-700">
                        {r.primaryLabel}
                      </p>
                      <StatusPill
                        label={SOURCE_LABEL[r.source]}
                        tone={SOURCE_TONE[r.source]}
                      />
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {formatDate(r.date)}
                      {r.secondaryLabel && ` · ${r.secondaryLabel}`}
                      {r.reference && ` · ${r.reference}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[14px] font-semibold ${
                        r.direction === "in"
                          ? "text-emerald-700"
                          : "text-foundation-700"
                      }`}
                    >
                      {r.direction === "in" ? "+" : "−"}
                      {formatNgn(r.amount)}
                    </p>
                    <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}

function SummaryStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const valueClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
      ? "text-red-700"
      : "text-foundation-700";
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-3 font-display text-[24px] font-extrabold leading-none tracking-[-0.02em] ${valueClass}`}
      >
        {value}
      </p>
    </Card>
  );
}

function PillGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
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
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-foundation-700/10 bg-paper px-2 py-1.5 text-[13px] text-foundation-700 focus:border-foundation-700/30 focus:outline-none"
      />
    </div>
  );
}

function NetFlowChart({
  series,
}: {
  series: Array<{ day: string; label: string; net: number }>;
}) {
  if (series.length === 0) return null;
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Net flow (recent days)
        </h3>
      </div>
      <div className="px-2 pb-2 pt-3" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="netFlowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FOUNDATION} stopOpacity={0.25} />
                <stop offset="100%" stopColor={FOUNDATION} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis hide />
            <Tooltip
              formatter={tooltipFormatNgn}
              contentStyle={{
                border: "1px solid rgba(31,65,74,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke={FOUNDATION}
              strokeWidth={2}
              fill="url(#netFlowFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
