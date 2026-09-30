"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Card, ErrorBox, Skeleton, formatDate } from "@/components/app/ui";
import { tenantApi, type Conversation } from "@/lib/tenant-api";
import { DEFAULT_PROPERTY_IMAGE } from "@/lib/propertyImage";
import { ChatThread } from "./ChatThread";
import { ConversationListingCard } from "./ConversationListingCard";
import {
  chatInboxHref,
  chatKeys,
  conversationTitle,
  initials,
  personName,
  type ChatScope,
} from "./chat-utils";

/**
 * Split-view inbox: one row per property thread on the left, the open
 * thread on the right. Selection lives in the URL (see chatInboxHref), so
 * switching threads stays on this page. On mobile it is list, then thread.
 */
export function ChatInbox({
  scope,
  activeId,
  emptyBody,
}: {
  scope: ChatScope;
  activeId: string | null;
  emptyBody: string;
}) {
  const conversations = useQuery({
    queryKey: chatKeys(scope).conversations,
    queryFn: () => tenantApi.listConversations(),
    refetchInterval: 15_000,
  });
  const list = conversations.data ?? [];
  const active = activeId ? list.find((c) => c.id === activeId) ?? null : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[480px] w-full max-w-6xl gap-4 px-4 py-4 sm:px-6">
      <Card className={`min-h-0 w-full shrink-0 flex-col overflow-hidden md:flex md:w-80 ${activeId ? "hidden" : "flex"}`}>
        <p className="border-b border-foundation-700/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Conversations
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : conversations.isError ? (
            <div className="p-4">
              <ErrorBox message={(conversations.error as Error)?.message} onRetry={() => conversations.refetch()} />
            </div>
          ) : list.length === 0 ? (
            <div className="grid h-full place-items-center p-6 text-center text-[13px] text-ink-muted">
              <span>
                <MessageCircle className="mx-auto mb-2 h-5 w-5" />
                <span className="block font-semibold text-foundation-700">No conversations yet</span>
                {emptyBody}
              </span>
            </div>
          ) : (
            <ul className="divide-y divide-foundation-700/10">
              {list.map((c) => (
                <li key={c.id}>
                  <ConversationRow c={c} scope={scope} active={c.id === activeId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex ${activeId ? "flex" : "hidden"}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-foundation-700/10 px-4 py-3">
              <Link
                href={chatInboxHref(scope)}
                aria-label="Back to conversations"
                className="grid h-8 w-8 place-items-center rounded-full text-foundation-700 transition hover:bg-foundation-700/5 md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-[11px] font-semibold text-paper">
                {initials(active.otherParty)}
              </span>
              <p className="truncate font-display text-[16px] font-extrabold text-foundation-700">
                {personName(active.otherParty)}
              </p>
            </div>
            <ConversationListingCard conversation={active} />
            <ChatThread key={active.id} conversation={active} scope={scope} />
          </>
        ) : activeId && conversations.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : activeId ? (
          <div className="grid flex-1 place-items-center p-10 text-center text-[13px] text-ink-muted">
            <span>
              This conversation could not be found.{" "}
              <Link href={chatInboxHref(scope)} className="font-semibold text-foundation-700 underline">
                Back to conversations
              </Link>
            </span>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center text-[13px] text-ink-muted">
            <span>
              <MessageCircle className="mx-auto mb-2 h-5 w-5" />
              Select a conversation to start chatting.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

function ConversationRow({ c, scope, active }: { c: Conversation; scope: ChatScope; active: boolean }) {
  const unread = c.unreadCount > 0;
  return (
    <Link
      href={chatInboxHref(scope, c.id)}
      scroll={false}
      className={`flex items-start gap-3 px-4 py-3 transition hover:bg-foundation-700/5 ${active ? "bg-cryola-50" : ""}`}
    >
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-foundation-700/5">
        <Image src={c.property?.image || DEFAULT_PROPERTY_IMAGE} alt="" fill sizes="44px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-[13.5px] text-foundation-700 ${unread ? "font-bold" : "font-semibold"}`}>
            {conversationTitle(c)}
          </span>
          <span className="shrink-0 text-[10.5px] text-ink-muted">
            {c.lastMessage?.createdAt ? formatDate(c.lastMessage.createdAt) : ""}
          </span>
        </span>
        <span className="block truncate text-[12px] font-medium text-foundation-700/80">{personName(c.otherParty)}</span>
        <span className={`block truncate text-[12px] ${unread ? "font-semibold text-foundation-700" : "text-ink-muted"}`}>
          {c.lastMessage ? `${c.lastMessage.isOwn ? "You: " : ""}${c.lastMessage.text}` : "No messages yet"}
        </span>
      </span>
      {unread && (
        <span className="mt-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-foundation-700 px-1.5 text-[10.5px] font-semibold text-paper">
          {c.unreadCount}
        </span>
      )}
    </Link>
  );
}
