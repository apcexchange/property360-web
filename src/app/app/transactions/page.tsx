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
import { landlordApi, Property, WalletTransaction } from "@/lib/landlord-api";

const FOUNDATION = "#1F414A";

function tooltipFormatNgn(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? formatNgn(n) : String(value ?? "");
}

type TypeFilter = "all" | "credit" | "debit";
type StatusFilter = "all" | "completed" | "pending" | "failed";

const STATUS_TONE: Record<
  WalletTransaction["status"],
  "good" | "warn" | "bad"
> = {
  completed: "good",
  pending: "warn",
  failed: "bad",
};

function toCsv(rows: WalletTransaction[]): string {
  const escape = (v: unknown): string => {
    const s = v === undefined || v === null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = ["Date", "Type", "Status", "Amount (NGN)", "Reference", "Description"];
  const lines = rows.map((t) =>
    [
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.type,
      t.status,
      t.amount,
      t.reference ?? "",
      t.description ?? "",
    ]
      .map(escape)
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export default function TransactionsPage() {
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState<string>("");

  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const q = useQuery({
    queryKey: ["wallet", "transactions", propertyId || "all"],
    queryFn: () =>
      landlordApi.walletTransactions(
        propertyId ? { propertyId } : undefined
      ),
  });

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    const term = search.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return list.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (status !== "all" && t.status !== status) return false;
      const ts = new Date(t.createdAt).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      if (term) {
        const haystack = `${t.description ?? ""} ${t.reference ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [q.data, type, status, from, to, search]);

  const totals = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const t of filtered) {
      if (t.status !== "completed") continue;
      if (t.type === "credit") credits += t.amount;
      else debits += t.amount;
    }
    return { credits, debits, net: credits - debits, count: filtered.length };
  }, [filtered]);

  // Day-bucketed net flow for the inline area chart. We bucket by local
  // calendar day, keep the most recent ~30 buckets (chronological), and
  // ignore non-completed rows so they don't skew the trend.
  const netFlowSeries = useMemo(() => {
    const buckets = new Map<string, { day: string; net: number; sortKey: number }>();
    for (const t of filtered) {
      if (t.status !== "completed") continue;
      const d = new Date(t.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      const signed = t.type === "credit" ? t.amount : -t.amount;
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

  return (
    <>
      <AppTopbar
        title="Transactions"
        subtitle="Wallet credits and debits"
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
            label="Credits"
            value={formatNgn(totals.credits)}
            tone="good"
          />
          <SummaryStat
            label="Debits"
            value={formatNgn(totals.debits)}
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
              label="Type"
              value={type}
              onChange={(v) => setType(v as TypeFilter)}
              options={[
                { label: "All", value: "all" },
                { label: "Credit", value: "credit" },
                { label: "Debit", value: "debit" },
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
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Description or reference"
                  className="w-full rounded-lg border border-foundation-700/10 bg-paper py-1.5 pl-7 pr-2 text-[13px] text-foundation-700 placeholder:text-ink-muted focus:border-foundation-700/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>

        <NetFlowChart series={netFlowSeries} />

        <div className="mt-6">
          {q.isLoading ? (
            <Card className="divide-y divide-foundation-700/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </Card>
          ) : q.isError ? (
            <ErrorBox
              message={(q.error as Error)?.message}
              onRetry={() => q.refetch()}
            />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState
              title="No transactions yet"
              body="Once tenants pay rent or you make a withdrawal, the entries land here."
            />
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-ink-muted">
              No transactions match the current filters.
            </Card>
          ) : (
            <Card className="divide-y divide-foundation-700/10">
              {filtered.map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-foundation-700">
                      {t.description}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {formatDate(t.createdAt)}
                      {t.reference && ` · ${t.reference}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[14px] font-semibold ${
                        t.type === "credit"
                          ? "text-emerald-700"
                          : "text-foundation-700"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "−"}
                      {formatNgn(t.amount)}
                    </p>
                    <StatusPill label={t.status} tone={STATUS_TONE[t.status]} />
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
