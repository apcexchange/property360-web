"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { ErrorBox, Skeleton } from "@/components/app/ui";
import { session } from "@/lib/session";
import { tenantApi, type Conversation } from "@/lib/tenant-api";
import { chatKeys, initials, messageSenderId, messageText, type ChatScope } from "./chat-utils";

const QUICK_REPLIES = [
  "Hi, is this still available?",
  "Can I book an inspection?",
  "Is the price negotiable?",
];

/** Messages and composer for one conversation. Polls every 5s. */
export function ChatThread({
  conversation,
  scope,
}: {
  conversation: Conversation;
  scope: ChatScope;
}) {
  const id = conversation.id;
  const keys = chatKeys(scope);
  const me = session.getUser();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useQuery({
    queryKey: keys.messages(id),
    queryFn: () => tenantApi.listMessages(id),
    refetchInterval: 5_000,
  });

  // Mark read on open and whenever new messages arrive while it is open.
  useEffect(() => {
    const k = chatKeys(scope);
    tenantApi.markConversationRead(id).then(
      () => {
        qc.invalidateQueries({ queryKey: k.unread });
        qc.invalidateQueries({ queryKey: k.conversations });
      },
      () => {}
    );
  }, [id, scope, messages.data?.length, qc]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data?.length, id]);

  const send = useMutation({
    mutationFn: (value: string) => tenantApi.sendMessage(id, value),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: keys.messages(id) });
      qc.invalidateQueries({ queryKey: keys.conversations });
    },
  });

  const submit = () => {
    const value = text.trim();
    if (value && !send.isPending) send.mutate(value);
  };

  const other = conversation.otherParty;
  const list = messages.data ?? [];
  // Enquiry prompts only make sense while the unit is on the marketplace.
  const quickReplies = conversation.listing?.isListed ? QUICK_REPLIES : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.isLoading ? (
          <>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-2/3" />
          </>
        ) : messages.isError ? (
          <ErrorBox message={(messages.error as Error)?.message} onRetry={() => messages.refetch()} />
        ) : list.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-[13px] text-ink-muted">
                {quickReplies.length ? "No messages yet. Start with a question:" : "No messages yet, say hi."}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setText(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[12.5px] font-medium text-foundation-700 transition hover:border-foundation-700/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          list.map((m) => {
            const mine = messageSenderId(m) === me?._id;
            return (
              <div key={m._id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 text-[10px] font-semibold text-paper">
                    {initials(other)}
                  </span>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13.5px] ${
                    mine ? "bg-foundation-700 text-paper" : "bg-foundation-700/5 text-foundation-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{messageText(m)}</p>
                  <p className={`mt-1 text-[10.5px] ${mine ? "text-paper/70" : "text-ink-muted"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {send.isError && (
        <p className="mx-3 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {(send.error as Error)?.message ?? "Message not sent."}
        </p>
      )}
      <form
        className="flex items-end gap-2 border-t border-foundation-700/10 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message"
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
        />
        <button
          type="submit"
          disabled={text.trim().length === 0 || send.isPending}
          aria-label="Send message"
          className="inline-flex h-[42px] items-center gap-1.5 rounded-full bg-foundation-700 px-4 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{send.isPending ? "Sending…" : "Send"}</span>
        </button>
      </form>
    </div>
  );
}
