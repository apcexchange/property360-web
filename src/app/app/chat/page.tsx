"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
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

export default function ChatListPage() {
  const q = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => landlordApi.chatConversations(),
    refetchInterval: 15_000,
  });

  return (
    <>
      <AppTopbar title="Messages" subtitle="Chats with tenants and agents" />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-2/3" />
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
            title="No conversations yet"
            body="When a tenant or agent messages you, the thread shows up here."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((c) => {
              const other = c.otherParty;
              const initials =
                ((other?.firstName?.[0] ?? "") + (other?.lastName?.[0] ?? "")) ||
                "?";
              return (
                <Link
                  key={c.id}
                  href={`/app/chat/${c.id}`}
                  className="flex items-start gap-3 p-4 transition hover:bg-foundation-700/5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foundation-700 text-[12px] font-semibold uppercase text-paper">
                    {initials.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-[14px] ${
                          c.unreadCount > 0
                            ? "font-bold text-foundation-700"
                            : "font-semibold text-foundation-700"
                        }`}
                      >
                        {other?.firstName} {other?.lastName}
                      </p>
                      <span className="shrink-0 text-[11px] text-ink-muted">
                        {c.lastMessage?.createdAt
                          ? formatDate(c.lastMessage.createdAt)
                          : ""}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-[12.5px] ${
                        c.unreadCount > 0
                          ? "font-semibold text-foundation-700"
                          : "text-ink-muted"
                      }`}
                    >
                      {c.lastMessage?.text ?? "—"}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="mt-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-foundation-700 px-1.5 text-[10.5px] font-semibold text-paper">
                      {c.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </Card>
        )}
      </PageContainer>
      <p className="px-6 pb-6 text-center text-[11px] text-ink-muted">
        <MessageCircle className="mr-1 inline h-3 w-3" />
        Real-time updates: list refreshes every 15s.
      </p>
    </>
  );
}
