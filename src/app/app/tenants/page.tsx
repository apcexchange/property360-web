"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Phone, Mail } from "lucide-react";
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
import { landlordApi } from "@/lib/landlord-api";

export default function TenantsPage() {
  const q = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });

  return (
    <>
      <AppTopbar
        title="Tenants"
        subtitle="Active leases across your portfolio"
        actions={
          <Link
            href="/app/tenants/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <UserPlus className="h-4 w-4" /> Add tenant
          </Link>
        }
      />
      <PageContainer>
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
            title="No tenants yet"
            body="Add a tenant to a vacant unit to start tracking rent and lease details."
            cta={{ label: "Add tenant", href: "/app/tenants/new" }}
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((row) => (
              <div key={row.tenant._id + row.unit._id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-foundation-700">
                      {row.tenant.firstName} {row.tenant.lastName}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      {row.property.name} · Unit {row.unit.unitNumber}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {row.tenant.email}
                      </span>
                      {row.tenant.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {row.tenant.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {row.lease ? (
                      <>
                        <StatusPill
                          label={row.lease.status}
                          tone={
                            row.lease.status === "active"
                              ? "good"
                              : row.lease.status === "expired"
                              ? "warn"
                              : row.lease.status === "terminated"
                              ? "bad"
                              : "info"
                          }
                        />
                        <p className="mt-1.5 text-[13px] font-semibold text-foundation-700">
                          {formatNgn(row.lease.rentAmount)}
                          <span className="ml-1 text-[11px] font-normal text-ink-muted">
                            /{row.lease.paymentFrequency}
                          </span>
                        </p>
                        <p className="text-[11.5px] text-ink-muted">
                          {formatDate(row.lease.startDate)} →{" "}
                          {formatDate(row.lease.endDate)}
                        </p>
                      </>
                    ) : (
                      <StatusPill label="No active lease" tone="warn" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
