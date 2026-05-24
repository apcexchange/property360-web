"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
import { landlordApi, ReservationStatus } from "@/lib/landlord-api";

const TONE: Record<ReservationStatus, "good" | "warn" | "bad" | "info"> = {
  pending: "warn",
  approved: "good",
  declined: "bad",
  paid: "good",
  cancelled: "neutral" as never,
};

export default function ReservationsPage() {
  const q = useQuery({
    queryKey: ["marketplace", "reservations"],
    queryFn: () => landlordApi.landlordReservationRequests(),
  });

  return (
    <>
      <AppTopbar
        title="Reservation requests"
        subtitle="Prospective tenants who've applied to your listings"
        actions={
          <Link
            href="/app/marketplace"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/3" />
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
            title="No reservation requests"
            body="When prospects request to reserve your listed units, they'll show up here."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((r) => (
              <Link
                key={r._id}
                href={`/app/marketplace/reservations/${r._id}`}
                className="flex items-center justify-between gap-3 p-4 transition hover:bg-foundation-700/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-foundation-700">
                      {r.tenant?.firstName} {r.tenant?.lastName}
                    </p>
                    <StatusPill label={r.status} tone={TONE[r.status]} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {typeof r.property === "object" ? r.property.name : ""}
                    {typeof r.unit === "object" &&
                      ` · Unit ${r.unit.unitNumber}`}
                    {" · "}
                    {formatDate(r.createdAt)}
                  </p>
                  {r.message && (
                    <p className="mt-1.5 line-clamp-2 text-[12px] text-foundation-700/80">
                      &ldquo;{r.message}&rdquo;
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </Link>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
