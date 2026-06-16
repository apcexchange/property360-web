"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileSignature, Mail, Home, IdCard } from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  StatCard,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { tenantApi, daysUntilDueLabel } from "@/lib/tenant-api";
import { session } from "@/lib/session";

export default function TenantHomePage() {
  const user = session.getUser();

  const dash = useQuery({
    queryKey: ["me", "dashboard"],
    queryFn: () => tenantApi.getDashboard(),
  });

  const summary = useQuery({
    queryKey: ["me", "payments", "summary"],
    queryFn: () => tenantApi.getPaymentSummary(),
    enabled: !!dash.data,
  });

  const invitations = useQuery({
    queryKey: ["me", "invitations"],
    queryFn: () => tenantApi.listInvitations(),
  });

  const profileRequests = useQuery({
    queryKey: ["me", "profile-requests"],
    queryFn: () => tenantApi.listPendingProfileRequests(),
  });
  const pendingProfileRequests = profileRequests.data ?? [];

  const leaseId = dash.data?.lease.id;
  const agreements = useQuery({
    queryKey: ["me", "agreements", leaseId],
    queryFn: () => tenantApi.listAgreementsByLease(leaseId!),
    enabled: !!leaseId,
  });

  const pendingInvitations = invitations.data ?? [];
  const unsignedAgreements =
    agreements.data?.filter(
      (a) =>
        a.status !== "signed" &&
        a.status !== "cancelled" &&
        !a.signedAt &&
        !a.acknowledgedAt
    ) ?? [];

  const lease = dash.data?.lease;
  const property = dash.data?.property;
  const unit = dash.data?.unit;

  const leaseStatus = lease?.status ?? "";
  const statusTone: "good" | "warn" | "bad" | "neutral" =
    leaseStatus === "active"
      ? "good"
      : leaseStatus === "pending"
      ? "warn"
      : leaseStatus === "expired" ||
        leaseStatus === "terminated" ||
        leaseStatus === "declined"
      ? "bad"
      : "neutral";

  return (
    <>
      <TenantTopbar
        title={`Welcome${user?.firstName ? `, ${user.firstName}` : ""}.`}
        subtitle="Your home, your payments, your requests."
      />
      <PageContainer>
        {pendingInvitations.length > 0 && (
          <Link
            href="/me/invitations"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-cryola-400 bg-cryola-200/40 p-4 transition hover:border-cryola-500"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                You have {pendingInvitations.length} pending lease{" "}
                {pendingInvitations.length === 1 ? "invitation" : "invitations"}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Review the terms and accept or decline.
              </p>
            </div>
            <ChevronRight className="mt-1.5 h-5 w-5 text-foundation-700" />
          </Link>
        )}

        {pendingProfileRequests.length > 0 && (
          <Link
            href={`/me/requests/${pendingProfileRequests[0].id}`}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-cryola-400 bg-cryola-200/40 p-4 transition hover:border-cryola-500"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
              <IdCard className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                Your landlord needs a few details
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Complete your tenant profile to share the requested information.
              </p>
            </div>
            <ChevronRight className="mt-1.5 h-5 w-5 text-foundation-700" />
          </Link>
        )}

        {unsignedAgreements.length > 0 && leaseId && (
          <Link
            href="/me/agreement"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 transition hover:border-amber-400"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500 text-paper">
              <FileSignature className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                Your tenancy agreement is waiting for your signature
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Read the document and sign it to finalize the lease.
              </p>
            </div>
            <ChevronRight className="mt-1.5 h-5 w-5 text-foundation-700" />
          </Link>
        )}

        {dash.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        ) : dash.isError ? (
          <ErrorBox
            message={(dash.error as Error)?.message}
            onRetry={() => dash.refetch()}
          />
        ) : !dash.data ? (
          <Card className="grid place-items-center p-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-foundation-700/5 text-foundation-700">
              <Home className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-[20px] font-bold text-foundation-700">
              No active lease yet
            </p>
            <p className="mt-2 max-w-md text-[13.5px] text-ink-muted">
              When a landlord assigns you to a unit, it shows up here. You can
              also browse marketplace listings and reserve a home.
            </p>
            <Link
              href="/listings"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              Browse listings <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="border-b border-foundation-700/10 bg-foundation-700 p-5 text-paper">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
                      Your home
                    </p>
                    <p className="mt-2 font-display text-[22px] font-extrabold leading-tight tracking-[-0.01em]">
                      {property?.name}
                    </p>
                    <p className="mt-1 text-[13px] text-paper/80">
                      Unit {unit?.unitNumber}
                      {unit?.bedrooms
                        ? ` · ${unit.bedrooms} bed${unit.bedrooms === 1 ? "" : "s"}`
                        : ""}
                      {unit?.bathrooms
                        ? ` · ${unit.bathrooms} bath${unit.bathrooms === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    <p className="mt-2 text-[12.5px] text-paper/70">
                      {[
                        property?.address?.street,
                        property?.address?.city,
                        property?.address?.state,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <StatusPill
                    label={leaseStatus || "—"}
                    tone={statusTone}
                  />
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                <KeyValue
                  label="Rent"
                  value={`${formatNgn(lease?.rentAmount ?? 0)} / ${
                    lease?.paymentFrequency ?? "month"
                  }`}
                />
                <KeyValue
                  label="Lease start"
                  value={formatDate(lease?.startDate)}
                />
                <KeyValue
                  label="Lease end"
                  value={formatDate(lease?.endDate)}
                />
              </div>
            </Card>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summary.isLoading || !summary.data ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-3 h-8 w-32" />
                  </Card>
                ))
              ) : (
                <>
                  <StatCard
                    label="Monthly rent"
                    value={formatNgn(summary.data.monthlyRent)}
                    hint={
                      summary.data.nextDueDate
                        ? `Next due ${formatDate(summary.data.nextDueDate)}`
                        : undefined
                    }
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatNgn(summary.data.outstandingBalance)}
                    hint={
                      summary.data.totalFeesOutstanding > 0
                        ? `${formatNgn(summary.data.totalFeesOutstanding)} in fees`
                        : "All clear"
                    }
                    href="/me/payments"
                  />
                  <StatCard
                    label="Total paid"
                    value={formatNgn(summary.data.totalPaid)}
                    hint="Lifetime on this lease"
                  />
                  <StatCard
                    label="Next payment"
                    value={
                      summary.data.nextDueDate
                        ? daysUntilDueLabel(summary.data.daysUntilDue)
                        : "—"
                    }
                    hint={
                      summary.data.nextDueDate
                        ? formatDate(summary.data.nextDueDate)
                        : "No upcoming due"
                    }
                  />
                </>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold text-foundation-700">
        {value}
      </p>
    </div>
  );
}
