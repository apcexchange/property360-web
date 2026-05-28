"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
} from "@/lib/landlord-api";

const STATUS_TABS: { key: MaintenanceStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default function MaintenancePage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("pending");

  const q = useQuery({
    queryKey: ["landlord", "maintenance", tab],
    queryFn: () =>
      landlordApi.listMaintenanceRequests(
        tab === "all" ? {} : { status: tab as MaintenanceStatus }
      ),
  });

  return (
    <>
      <AppTopbar
        title="Maintenance"
        subtitle="Requests your tenants have filed across every property"
      />
      <PageContainer>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-foundation-700 text-paper"
                    : "bg-foundation-700/5 text-foundation-700 hover:bg-foundation-700/10"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 5 }).map((_, i) => (
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
            title={tab === "pending" ? "No open requests" : "Nothing here"}
            body={
              tab === "pending"
                ? "When a tenant files a maintenance request from their app, it'll show up here."
                : "No requests match this filter yet."
            }
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((r) => (
              <MaintenanceRow key={r._id} r={r} />
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}

function priorityTone(p: MaintenancePriority): "neutral" | "info" | "warn" | "bad" {
  switch (p) {
    case "urgent":
      return "bad";
    case "high":
      return "warn";
    case "medium":
      return "info";
    case "low":
    default:
      return "neutral";
  }
}

function statusTone(s: MaintenanceStatus): "neutral" | "good" | "warn" | "info" | "bad" {
  switch (s) {
    case "pending":
      return "warn";
    case "in_progress":
      return "info";
    case "completed":
      return "good";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

function MaintenanceRow({ r }: { r: MaintenanceRequest }) {
  const tenant =
    typeof r.tenant === "object"
      ? `${r.tenant.firstName} ${r.tenant.lastName}`
      : "Tenant";
  const property = typeof r.property === "object" ? r.property.name : "";
  const unit = typeof r.unit === "object" ? `Unit ${r.unit.unitNumber}` : "";

  return (
    <Link
      href={`/app/maintenance/${r._id}`}
      className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-foundation-700/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foundation-700">
            {r.title}
          </p>
          <StatusPill
            label={r.status.replace("_", " ")}
            tone={statusTone(r.status)}
          />
          <StatusPill label={r.priority} tone={priorityTone(r.priority)} />
        </div>
        <p className="mt-1 truncate text-[12.5px] text-ink-muted">
          {tenant}
          {property ? ` · ${property}` : ""}
          {unit ? ` · ${unit}` : ""}
        </p>
      </div>
      <p className="text-[12.5px] text-ink-muted">{formatDate(r.createdAt)}</p>
    </Link>
  );
}
