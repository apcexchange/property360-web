"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  formatDate,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => landlordApi.notifications(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => landlordApi.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => landlordApi.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (q.data ?? []).filter((n) => !n.read).length;

  return (
    <>
      <AppTopbar
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        actions={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />{" "}
              {markAll.isPending ? "Marking…" : "Mark all read"}
            </button>
          ) : null
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-2/3" />
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
            title="No notifications"
            body="You'll see lease, payment, reservation and chat alerts here."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => !n.read && markRead.mutate(n._id)}
                className={`group block w-full text-left p-4 transition ${
                  n.read ? "" : "bg-cryola-50/40 hover:bg-cryola-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Bell
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      n.read ? "text-ink-muted" : "text-foundation-700"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] ${
                        n.read
                          ? "text-foundation-700"
                          : "font-semibold text-foundation-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cryola-500" />
                  )}
                </div>
              </button>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
