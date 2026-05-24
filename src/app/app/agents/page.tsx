"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Mail } from "lucide-react";
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
import { landlordApi, Agent } from "@/lib/landlord-api";

const PERMISSION_LABELS: Record<string, string> = {
  canAddTenant: "Add tenants",
  canRecordPayment: "Record payments",
  canRenewLease: "Renew leases",
  canUploadAgreements: "Upload agreements",
  canManageMaintenance: "Maintenance",
  canViewPayments: "View payments",
  canViewReports: "View reports",
  canRemoveTenant: "Remove tenants",
};

function displayName(a: Agent): string {
  if (a.agent && (a.agent.firstName || a.agent.lastName)) {
    return `${a.agent.firstName ?? ""} ${a.agent.lastName ?? ""}`.trim();
  }
  return "Pending sign-up";
}

function displayEmail(a: Agent): string {
  return a.agent?.email ?? a.inviteEmail ?? "";
}

export default function AgentsPage() {
  const q = useQuery({
    queryKey: ["agents"],
    queryFn: () => landlordApi.listAgents(),
  });

  return (
    <>
      <AppTopbar
        title="Property managers"
        subtitle="People who can act on your behalf"
        actions={
          <Link
            href="/app/agents/invite"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <UserPlus className="h-4 w-4" /> Invite property manager
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 3 }).map((_, i) => (
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
            title="No property managers yet"
            body="Invite a property manager to help you handle tenants, payments, and maintenance. You control their permissions per property."
            cta={{ label: "Invite property manager", href: "/app/agents/invite" }}
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((a) => (
              <div key={a._id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14.5px] font-semibold text-foundation-700">
                        {displayName(a)}
                      </p>
                      <StatusPill
                        label={a.status}
                        tone={
                          a.status === "accepted"
                            ? "good"
                            : a.status === "pending"
                            ? "warn"
                            : "neutral"
                        }
                      />
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-ink-muted">
                      <Mail className="h-3 w-3" /> {displayEmail(a)}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      Invited {formatDate(a.createdAt)}
                      {!a.agent && a.status === "pending"
                        ? " — waiting for them to create an account"
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(a.permissions ?? {})
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <span
                        key={k}
                        className="rounded-full border border-foundation-700/10 bg-surface px-2.5 py-1 text-[11px] font-medium text-foundation-700"
                      >
                        {PERMISSION_LABELS[k] ?? k}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
