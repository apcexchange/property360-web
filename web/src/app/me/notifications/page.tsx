"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  CreditCard,
  Wrench,
  FileText,
  Home,
  Mail,
} from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  EmptyState,
  formatDate,
} from "@/components/app/ui";
import { tenantApi, TenantNotification } from "@/lib/tenant-api";

function iconFor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("payment") || t.includes("invoice") || t.includes("rent") || t.includes("fee")) {
    return <CreditCard className="h-4 w-4" />;
  }
  if (t.includes("maintenance") || t.includes("request")) {
    return <Wrench className="h-4 w-4" />;
  }
  if (t.includes("lease") || t.includes("invitation")) {
    return <Home className="h-4 w-4" />;
  }
  if (t.includes("agreement") || t.includes("document") || t.includes("sign")) {
    return <FileText className="h-4 w-4" />;
  }
  if (t.includes("message") || t.includes("chat")) {
    return <Mail className="h-4 w-4" />;
  }
  return <Bell className="h-4 w-4" />;
}

function isRead(n: TenantNotification): boolean {
  return n.read === true || n.isRead === true;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();

  // Some notifications deep-link somewhere actionable. A profile request opens
  // its fill page so the tenant can complete it straight from the bell.
  const linkFor = (n: TenantNotification): string | null => {
    if (n.type === "profile_request") {
      const requestId = n.data?.requestId;
      if (typeof requestId === "string") return `/me/requests/${requestId}`;
    }
    return null;
  };

  const q = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => tenantApi.listNotifications({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const markAll = useMutation({
    mutationFn: () => tenantApi.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => tenantApi.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "notifications"] }),
  });

  const unread = (q.data ?? []).filter((n) => !isRead(n)).length;

  return (
    <>
      <TenantTopbar
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "All caught up"}
        actions={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />{" "}
              {markAll.isPending ? "Updating…" : "Mark all read"}
            </button>
          ) : undefined
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-48 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No notifications yet"
            body="When something happens on your lease, payments, or requests, we'll let you know here."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((n) => {
              const read = isRead(n);
              return (
                <button
                  type="button"
                  key={n._id}
                  onClick={() => {
                    if (!read) markOne.mutate(n._id);
                    const href = linkFor(n);
                    if (href) router.push(href);
                  }}
                  className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-foundation-700/5 ${
                    read ? "opacity-75" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      read
                        ? "bg-foundation-700/10 text-foundation-700"
                        : "bg-foundation-700 text-paper"
                    }`}
                  >
                    {iconFor(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-[13.5px] ${
                          read
                            ? "font-medium text-foundation-700"
                            : "font-bold text-foundation-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-ink-muted">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      {n.body ?? n.message ?? ""}
                    </p>
                  </div>
                  {!read && (
                    <span
                      aria-hidden
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cryola-500"
                    />
                  )}
                </button>
              );
            })}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
