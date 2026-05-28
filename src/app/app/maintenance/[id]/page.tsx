"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

const STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: MaintenancePriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function priorityTone(
  p: MaintenancePriority
): "neutral" | "info" | "warn" | "bad" {
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

function statusTone(
  s: MaintenanceStatus
): "neutral" | "good" | "warn" | "info" | "bad" {
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

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["landlord", "maintenance", id],
    queryFn: () => landlordApi.getMaintenanceRequest(id),
    enabled: !!id,
  });

  const update = useMutation({
    mutationFn: (body: {
      status?: MaintenanceStatus;
      priority?: MaintenancePriority;
    }) => landlordApi.updateMaintenanceRequest(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landlord", "maintenance"] });
      qc.invalidateQueries({ queryKey: ["landlord", "maintenance", id] });
      toast.success({ title: "Updated" });
    },
    onError: () => toast.error("Couldn't update request"),
  });

  const r = q.data;
  const closed = r?.status === "completed" || r?.status === "cancelled";

  const tenant =
    r && typeof r.tenant === "object"
      ? r.tenant
      : { firstName: "", lastName: "", email: undefined, phone: undefined };
  const property = r && typeof r.property === "object" ? r.property : null;
  const unit = r && typeof r.unit === "object" ? r.unit : null;

  return (
    <>
      <AppTopbar
        title="Maintenance request"
        actions={
          <Link
            href="/app/maintenance"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card>
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </Card>
        ) : q.isError || !r ? (
          <ErrorBox
            message={(q.error as Error)?.message || "Not found"}
            onRetry={() => q.refetch()}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-semibold text-foundation-700">
                      {r.title}
                    </h1>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      Filed {formatDate(r.createdAt)}
                      {r.completedAt
                        ? ` · Completed ${formatDate(r.completedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill
                      label={r.status.replace("_", " ")}
                      tone={statusTone(r.status)}
                    />
                    <StatusPill
                      label={r.priority}
                      tone={priorityTone(r.priority)}
                    />
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-foundation-700/85">
                  {r.description}
                </p>
              </Card>

              {r.images && r.images.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-foundation-700">
                    Attached photos
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {r.images.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-square overflow-hidden rounded-lg border border-foundation-700/10"
                      >
                        <Image
                          src={url}
                          alt="Maintenance attachment"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </a>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-5">
              <Card>
                <h2 className="text-sm font-semibold text-foundation-700">
                  Tenant
                </h2>
                <p className="mt-2 text-sm text-foundation-700">
                  {tenant.firstName} {tenant.lastName}
                </p>
                {tenant.email && (
                  <p className="text-[12.5px] text-ink-muted">{tenant.email}</p>
                )}
                {tenant.phone && (
                  <p className="text-[12.5px] text-ink-muted">{tenant.phone}</p>
                )}
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-foundation-700">
                  Location
                </h2>
                {property ? (
                  <p className="mt-2 text-sm text-foundation-700">
                    {property.name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">—</p>
                )}
                {unit && (
                  <p className="text-[12.5px] text-ink-muted">
                    Unit {unit.unitNumber}
                  </p>
                )}
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-foundation-700">
                  Actions
                </h2>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Status
                    </label>
                    <select
                      value={r.status}
                      disabled={closed || update.isPending}
                      onChange={(e) =>
                        update.mutate({
                          status: e.target.value as MaintenanceStatus,
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-sm text-foundation-700 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Priority
                    </label>
                    <select
                      value={r.priority}
                      disabled={closed || update.isPending}
                      onChange={(e) =>
                        update.mutate({
                          priority: e.target.value as MaintenancePriority,
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-sm text-foundation-700 disabled:opacity-50"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {closed && (
                    <p className="text-[12.5px] text-ink-muted">
                      This request is {r.status.replace("_", " ")} and can no
                      longer be changed.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
