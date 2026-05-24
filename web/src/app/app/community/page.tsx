"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight } from "lucide-react";
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

export default function CommunityPage() {
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const [propertyId, setPropertyId] = useState("");

  // Pick the first property automatically.
  useEffect(() => {
    if (!propertyId && properties.data && properties.data.length > 0) {
      setPropertyId(properties.data[0]._id);
    }
  }, [properties.data, propertyId]);

  const bills = useQuery({
    queryKey: ["shared-bills", propertyId],
    queryFn: () => landlordApi.sharedBillsForProperty(propertyId),
    enabled: !!propertyId,
  });

  return (
    <>
      <AppTopbar
        title="Building community"
        subtitle="Shared bills tenants raise for their building (read-only)"
      />
      <PageContainer>
        {properties.isLoading ? (
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        ) : (properties.data ?? []).length === 0 ? (
          <EmptyState
            title="No properties"
            body="Once you add a property, any shared bills its tenants raise will appear here."
            cta={{ label: "Add property", href: "/app/properties/new" }}
          />
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <Building2 className="h-4 w-4 text-foundation-700" />
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2 text-[14px] text-foundation-700"
              >
                {properties.data!.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {bills.isLoading ? (
              <Card className="divide-y divide-foundation-700/10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </Card>
            ) : bills.isError ? (
              <ErrorBox
                message={(bills.error as Error)?.message}
                onRetry={() => bills.refetch()}
              />
            ) : (bills.data ?? []).length === 0 ? (
              <EmptyState
                title="No shared bills"
                body="When your tenants raise a shared bill for utilities, repairs, or other communal costs, they'll show up here. Only tenants can create them."
              />
            ) : (
              <Card className="divide-y divide-foundation-700/10">
                {bills.data!.map((b) => (
                  <Link
                    key={b._id}
                    href={`/app/community/bills/${b._id}`}
                    className="flex items-center justify-between gap-3 p-4 transition hover:bg-foundation-700/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-foundation-700">
                          {b.title}
                        </p>
                        <StatusPill
                          label={b.status}
                          tone={
                            b.status === "settled"
                              ? "good"
                              : b.status === "closed"
                              ? "neutral"
                              : "info"
                          }
                        />
                      </div>
                      {b.description && (
                        <p className="mt-1 line-clamp-1 text-[12px] text-ink-muted">
                          {b.description}
                        </p>
                      )}
                      <p className="mt-1 text-[11.5px] text-ink-muted">
                        Raised by{" "}
                        {typeof b.createdBy === "object"
                          ? `${b.createdBy.firstName} ${b.createdBy.lastName}`
                          : "tenant"}
                        {" · "}
                        {formatDate(b.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foundation-700">
                        {formatNgn(b.totalAmount)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-ink-muted" />
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
