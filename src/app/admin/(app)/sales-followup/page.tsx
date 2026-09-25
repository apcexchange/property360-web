"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import { StatCard } from "@/components/admin/ui/StatCard";
import { ErrorState } from "@/components/admin/ui/ErrorState";
import { Button, SearchInput, Select } from "@/components/admin/ui/Filters";
import { ControlsCard } from "@/components/admin/sales-followup/ControlsCard";
import { FunnelTable } from "@/components/admin/sales-followup/FunnelTable";
import { JourneyDrawer } from "@/components/admin/sales-followup/JourneyDrawer";
import { errorMessage, STATUS_LABELS, STOP_REASON_LABELS, TRACK_LABELS } from "@/components/admin/sales-followup/labels";
import adminApi, { SalesJourneyRow } from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

function HotBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
      Hot
    </span>
  );
}

export default function AdminSalesFollowUpPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [track, setTrack] = useState("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const limit = 25;

  const stats = useQuery({
    queryKey: ["admin", "sales-followup", "stats"],
    queryFn: () => adminApi.getSalesFollowUpStats(),
  });

  const journeys = useQuery({
    queryKey: ["admin", "sales-followup", "journeys", { page, search, status, track, hotOnly }],
    queryFn: () =>
      adminApi.listSalesJourneys({
        page,
        limit,
        search: search.trim() || undefined,
        status,
        track,
        hot: hotOnly,
      }),
    placeholderData: keepPreviousData,
  });

  const t = stats.data?.totals;
  const hasActiveFilters = search.trim() !== "" || status !== "all" || track !== "all" || hotOnly;

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            eyebrow="Growth"
            title="Sales follow-up"
            description="Automated WhatsApp and email follow-up for landlords and agents who are not paying yet, plus the AI sales chat."
          />

          {stats.isError ? (
            <ErrorState title="Could not load sales follow-up" onRetry={() => void stats.refetch()} />
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Active journeys"
                  loading={stats.isLoading}
                  value={t?.activeJourneys ?? 0}
                  hint={t ? `${t.hotJourneys} hot` : undefined}
                />
                <StatCard
                  label="Conversions this month"
                  loading={stats.isLoading}
                  value={t?.conversionsThisMonth ?? 0}
                  hint={t ? `${t.conversionsViaChatThisMonth} after an AI chat` : undefined}
                />
                <StatCard
                  label="Revenue this month"
                  loading={stats.isLoading}
                  value={formatNgn(t?.revenueThisMonthNgn ?? 0)}
                />
                <StatCard
                  label="Revenue all time"
                  loading={stats.isLoading}
                  value={formatNgn(t?.revenueAllTimeNgn ?? 0)}
                  hint={t ? `${t.conversionsAllTime} conversions` : undefined}
                />
              </div>

              {stats.data && <ControlsCard settings={stats.data.settings} steps={stats.data.steps} />}
              {stats.data && <FunnelTable rows={stats.data.funnel} />}
            </>
          )}

          <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-display text-[20px] font-medium text-foundation-700">Journeys</h3>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Name, email or phone"
              className="w-56"
            />
            <Select
              value={status}
              aria-label="Filter by status"
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <option value="all">Any status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={track}
              aria-label="Filter by track"
              onChange={(v) => {
                setTrack(v);
                setPage(1);
              }}
            >
              <option value="all">Any track</option>
              {Object.entries(TRACK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button
              variant={hotOnly ? "primary" : "secondary"}
              aria-pressed={hotOnly}
              onClick={() => {
                setHotOnly((h) => !h);
                setPage(1);
              }}
            >
              Hot only
            </Button>
          </div>

          {journeys.isError ? (
            <ErrorState
              title="Could not load journeys"
              description={errorMessage(journeys.error)}
              onRetry={() => void journeys.refetch()}
            />
          ) : (
          <DataTable<SalesJourneyRow>
            loading={journeys.isLoading}
            rows={journeys.data?.items ?? []}
            empty={hasActiveFilters ? "No journeys match these filters" : "No journeys yet"}
            emptyDescription={
              hasActiveFilters
                ? "Try a different search, status or track."
                : "Journeys start when landlords or agents sign up, or after the backfill script runs."
            }
            onRowClick={(r) => setViewingId(r._id)}
            columns={[
              {
                key: "user",
                header: "User",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {r.user ? `${r.user.firstName} ${r.user.lastName}` : "Deleted user"}
                      {r.hot && <HotBadge />}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {r.user ? [r.user.email, r.user.phone].filter(Boolean).join(" · ") : ""}
                    </div>
                  </div>
                ),
              },
              { key: "role", header: "Role", render: (r) => <span className="capitalize">{r.user?.role ?? "?"}</span> },
              { key: "track", header: "Track", render: (r) => TRACK_LABELS[r.track] },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <div>
                    <div>{STATUS_LABELS[r.status]}</div>
                    {r.stopReason && (
                      <div className="text-xs text-ink-muted">{STOP_REASON_LABELS[r.stopReason] ?? r.stopReason}</div>
                    )}
                  </div>
                ),
              },
              { key: "variant", header: "Var.", render: (r) => <span className="font-mono">{r.variant}</span> },
              { key: "next", header: "Next step", render: (r) => (r.nextStepAt ? formatDate(r.nextStepAt) : "None") },
              {
                key: "reply",
                header: "Last reply",
                render: (r) => (r.lastUserReplyAt ? formatDate(r.lastUserReplyAt) : "None"),
              },
            ]}
          />
          )}
          {!journeys.isError && (
            <Pagination page={page} total={journeys.data?.total ?? 0} limit={limit} onChange={setPage} />
          )}
        </div>
      </main>

      <JourneyDrawer journeyId={viewingId} onClose={() => setViewingId(null)} />
    </>
  );
}
