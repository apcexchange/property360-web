"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Inbox, X } from "lucide-react";
import { ErrorBox, Skeleton } from "@/components/app/ui";
import { tenantApi } from "@/lib/tenant-api";
import { ChatThread } from "./ChatThread";
import { ConversationListingCard } from "./ConversationListingCard";
import { chatInboxHref, chatKeys, initials, personName, type ChatScope } from "./chat-utils";

/**
 * Chat drawer opened from "Message the owner" on a public listing, so the
 * visitor can talk to the publisher without leaving the listing. The same
 * thread shows in their inbox.
 */
export function ListingChatPanel({
  conversationId,
  scope,
  onClose,
}: {
  conversationId: string;
  scope: ChatScope;
  onClose: () => void;
}) {
  const conversations = useQuery({
    queryKey: chatKeys(scope).conversations,
    queryFn: () => tenantApi.listConversations(),
  });
  const conversation = conversations.data?.find((c) => c.id === conversationId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Chat with the owner">
      <button type="button" aria-label="Close chat" onClick={onClose} className="absolute inset-0 bg-foundation-900/40" />
      <div className="relative flex h-full w-full flex-col bg-paper shadow-2xl sm:max-w-md">
        <div className="flex items-center gap-3 border-b border-foundation-700/10 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-[11px] font-semibold text-paper">
            {initials(conversation?.otherParty)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[16px] font-extrabold text-foundation-700">
              {conversation ? personName(conversation.otherParty) : "Conversation"}
            </p>
            <Link
              href={chatInboxHref(scope, conversationId)}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-muted underline-offset-2 hover:text-foundation-700 hover:underline"
            >
              <Inbox className="h-3 w-3" /> Open in inbox
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="grid h-9 w-9 place-items-center rounded-full text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {conversation ? (
          <>
            <ConversationListingCard conversation={conversation} showLink={false} />
            <ChatThread conversation={conversation} scope={scope} />
          </>
        ) : conversations.isError ? (
          <div className="p-4">
            <ErrorBox message={(conversations.error as Error)?.message} onRetry={() => conversations.refetch()} />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        )}
      </div>
    </div>
  );
}
