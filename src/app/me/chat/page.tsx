"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  Card,
  Skeleton,
  ErrorBox,
  formatDate,
} from "@/components/app/ui";
import { session } from "@/lib/session";
import { tenantApi, Conversation, Message } from "@/lib/tenant-api";

function counterparty(c: Conversation, meId?: string) {
  return c.participants.find((p) => p._id !== meId);
}

function messageText(m: Message): string {
  return m.text ?? m.content ?? "";
}

export default function TenantChatPage() {
  const me = session.getUser();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["me", "chat", "conversations"],
    queryFn: () => tenantApi.listConversations(),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!activeId && (conversations.data ?? []).length > 0) {
      setActiveId(conversations.data![0]._id);
    }
  }, [activeId, conversations.data]);

  const messages = useQuery({
    queryKey: ["me", "chat", "messages", activeId],
    queryFn: () => tenantApi.listMessages(activeId!),
    enabled: !!activeId,
    refetchInterval: activeId ? 5_000 : false,
  });

  useEffect(() => {
    if (!activeId) return;
    tenantApi.markConversationRead(activeId).catch(() => {});
  }, [activeId, messages.data?.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data?.length, activeId]);

  const send = useMutation({
    mutationFn: () => tenantApi.sendMessage(activeId!, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["me", "chat", "messages", activeId] });
      qc.invalidateQueries({ queryKey: ["me", "chat", "conversations"] });
    },
  });

  const active =
    activeId
      ? conversations.data?.find((c) => c._id === activeId) ?? null
      : null;
  const other = active ? counterparty(active, me?._id) : null;

  return (
    <>
      <TenantTopbar
        title="Chat"
        subtitle="Talk to your landlord or property manager"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 px-6 py-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <Card className="h-full overflow-hidden">
            {conversations.isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : conversations.isError ? (
              <div className="p-4">
                <ErrorBox
                  message={(conversations.error as Error)?.message}
                  onRetry={() => conversations.refetch()}
                />
              </div>
            ) : (conversations.data ?? []).length === 0 ? (
              <div className="grid h-full place-items-center p-6 text-center text-[13px] text-ink-muted">
                <span>
                  <MessageCircle className="mx-auto mb-2 h-5 w-5" />
                  No conversations yet.
                </span>
              </div>
            ) : (
              <ul className="divide-y divide-foundation-700/10">
                {conversations.data!.map((c) => {
                  const p = counterparty(c, me?._id);
                  const isActive = activeId === c._id;
                  const initials =
                    ((p?.firstName?.[0] ?? "") + (p?.lastName?.[0] ?? "")) || "?";
                  const last = c.lastMessage?.text ?? c.lastMessage?.content;
                  return (
                    <li key={c._id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(c._id)}
                        className={`flex w-full items-start gap-3 p-3 text-left transition hover:bg-foundation-700/5 ${
                          isActive ? "bg-foundation-700/5" : ""
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-[11px] font-semibold uppercase text-paper">
                          {initials.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`truncate text-[13px] ${
                                c.unreadCount > 0
                                  ? "font-bold text-foundation-700"
                                  : "font-semibold text-foundation-700"
                              }`}
                            >
                              {p?.firstName} {p?.lastName}
                            </p>
                            <span className="shrink-0 text-[10.5px] text-ink-muted">
                              {c.lastMessage?.createdAt
                                ? formatDate(c.lastMessage.createdAt)
                                : ""}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                            {last ?? "—"}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="mt-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-foundation-700 px-1 text-[10px] font-semibold text-paper">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile conversation switcher */}
          <div className="mb-3 md:hidden">
            {(conversations.data ?? []).length > 0 && (
              <select
                value={activeId ?? ""}
                onChange={(e) => setActiveId(e.target.value || null)}
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700"
              >
                {conversations.data!.map((c) => {
                  const p = counterparty(c, me?._id);
                  return (
                    <option key={c._id} value={c._id}>
                      {p?.firstName} {p?.lastName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {!activeId ? (
            <Card className="grid flex-1 place-items-center p-10 text-center text-[13px] text-ink-muted">
              Select a conversation to start chatting.
            </Card>
          ) : (
            <Card className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-foundation-700/10 p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Conversation
                </p>
                <p className="mt-1 font-display text-[16px] font-extrabold text-foundation-700">
                  {other ? `${other.firstName} ${other.lastName}` : "—"}
                </p>
                {other?.email && (
                  <p className="text-[11.5px] text-ink-muted">
                    {other.email}
                  </p>
                )}
              </div>
              <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto p-4"
                style={{ maxHeight: "55vh", minHeight: 320 }}
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
                    const mine = m.sender === me?._id;
                    const initials =
                      ((other?.firstName?.[0] ?? "") +
                        (other?.lastName?.[0] ?? "")) ||
                      "?";
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
                          <p className="whitespace-pre-wrap">{messageText(m)}</p>
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
                className="flex items-center gap-2 border-t border-foundation-700/10 p-3"
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
              <p className="border-t border-foundation-700/10 p-2 text-center text-[10.5px] text-ink-muted">
                Updates every 5s.
              </p>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
