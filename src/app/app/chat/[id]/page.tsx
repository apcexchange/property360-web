"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import { Card, ErrorBox, Skeleton } from "@/components/app/ui";
import { session } from "@/lib/session";
import { landlordApi } from "@/lib/landlord-api";

export default function ChatThreadPage() {
  const { id } = useParams<{ id: string }>();
  const me = session.getUser();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => landlordApi.chatConversations(),
  });
  const other = conversations.data?.find((c) => c.id === id)?.otherParty;

  const messages = useQuery({
    queryKey: ["chat", "messages", id],
    queryFn: () => landlordApi.chatMessages(id),
    enabled: !!id,
    refetchInterval: 5_000,
  });

  // Mark conversation as read on mount + whenever new messages arrive while open
  useEffect(() => {
    if (!id) return;
    landlordApi.markConversationRead(id).then(
      () => qc.invalidateQueries({ queryKey: ["app", "chat", "unread-count"] }),
      () => {}
    );
  }, [id, messages.data?.length, qc]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: () => landlordApi.sendMessage(id, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", "messages", id] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });

  const initials =
    ((other?.firstName?.[0] ?? "") + (other?.lastName?.[0] ?? "")) || "?";

  return (
    <>
      <AppTopbar
        title={other ? `${other.firstName} ${other.lastName}` : "Conversation"}
        subtitle={other?.email}
        actions={
          <Link
            href="/app/chat"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-4">
        <div
          ref={scrollRef}
          className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-foundation-700/10 bg-paper p-4"
          style={{ maxHeight: "60vh", minHeight: 360 }}
        >
          {messages.isLoading ? (
            <>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="ml-auto h-10 w-1/2" />
              <Skeleton className="h-10 w-2/3" />
            </>
          ) : messages.isError ? (
            <ErrorBox
              message={(messages.error as Error)?.message}
              onRetry={() => messages.refetch()}
            />
          ) : (messages.data ?? []).length === 0 ? (
            <p className="grid h-full place-items-center text-[13px] text-ink-muted">
              No messages yet — say hi.
            </p>
          ) : (
            messages.data!.map((m) => {
              const senderId =
                typeof m.sender === "string" ? m.sender : m.sender._id;
              const mine = senderId === me?._id;
              return (
                <div
                  key={m._id}
                  className={`flex items-end gap-2 ${
                    mine ? "justify-end" : "justify-start"
                  }`}
                >
                  {!mine && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 text-[10px] font-semibold uppercase text-paper">
                      {initials.toUpperCase()}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13.5px] ${
                      mine
                        ? "bg-foundation-700 text-paper"
                        : "bg-foundation-700/5 text-foundation-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <p
                      className={`mt-1 text-[10.5px] ${
                        mine ? "text-paper/70" : "text-ink-muted"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString("en-NG", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length > 0) send.mutate();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="flex-1 rounded-full border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
          />
          <button
            type="submit"
            disabled={text.trim().length === 0 || send.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />{" "}
            {send.isPending ? "Sending…" : "Send"}
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-ink-muted">
          Updates every 5s.
        </p>
      </div>
    </>
  );
}

