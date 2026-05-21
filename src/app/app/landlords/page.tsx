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
import { landlordApi, Agent, PartySummary } from "@/lib/landlord-api";

function isPopulated(p: PartySummary | string | null | undefined): p is PartySummary {
  return !!p && typeof p === "object" && "_id" in p;
}

function displayName(a: Agent): string {
  if (isPopulated(a.landlord)) {
    return `${a.landlord.firstName ?? ""} ${a.landlord.lastName ?? ""}`.trim() ||
      "Pending sign-up";
  }
  return "Pending sign-up";
}

function displayEmail(a: Agent): string {
  if (isPopulated(a.landlord) && a.landlord.email) return a.landlord.email;
  return a.inviteEmail ?? "";
}

export default function LandlordsPage() {
  const q = useQuery({
    queryKey: ["my-landlords"],
    queryFn: () => landlordApi.listMyLandlords(),
  });

  const invites = useQuery({
    queryKey: ["my-landlord-invitations-sent"],
    queryFn: () => landlordApi.myLandlordInvitations().catch(() => []),
  });
  void invites;

  return (
    <>
      <AppTopbar
        title="Landlords"
        subtitle="Property owners you manage on Property360"
        actions={
          <Link
            href="/app/landlords/invite"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <UserPlus className="h-4 w-4" /> Invite landlord
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
            title="No landlords yet"
            body="Invite a landlord and ask them to let you manage their properties on Property360. They control which properties you can access."
            cta={{ label: "Invite landlord", href: "/app/landlords/invite" }}
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
                      Linked {formatDate(a.createdAt)}
                    </p>
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
