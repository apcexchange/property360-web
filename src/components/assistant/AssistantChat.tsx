"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Send, Sparkles } from "lucide-react";
import { Skeleton, ErrorBox } from "@/components/app/ui";
import { assistantApi, AssistantTurn } from "@/lib/assistant-api";

const HISTORY_KEY = ["assistant", "history"];

export function AssistantChat({ suggestions }: { suggestions: string[] }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: assistantApi.getHistory,
  });

  const mutation = useMutation({
    mutationFn: (value: string) => assistantApi.send(value),
    onMutate: async (value: string) => {
      await qc.cancelQueries({ queryKey: HISTORY_KEY });
      const previous = qc.getQueryData<AssistantTurn[]>(HISTORY_KEY);
      const optimistic: AssistantTurn = {
        role: "user",
        content: value,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<AssistantTurn[]>(HISTORY_KEY, [
        ...(previous ?? []),
        optimistic,
      ]);
      return { previous };
    },
    onError: (_err, _value, ctx) => {
      // The 402 Pro-gate is handled globally (api interceptor + modal).
      // Here we just roll back the optimistic message.
      if (ctx?.previous) qc.setQueryData(HISTORY_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });

  const turns = history.data ?? [];

  // Auto-scroll to bottom on new messages or while a reply is pending.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length, mutation.isPending]);

  function fire(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || mutation.isPending) return;
    mutation.mutate(trimmed);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-foundation-700/10 bg-paper p-4"
        style={{ maxHeight: "60vh", minHeight: 360 }}
      >
        {history.isLoading ? (
          <>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-2/3" />
          </>
        ) : history.isError ? (
          <ErrorBox
            message={(history.error as Error)?.message}
            onRetry={() => history.refetch()}
          />
        ) : turns.length === 0 ? (
          <div className="grid h-full place-content-center gap-4 text-center">
            <div>
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-foundation-700 text-paper">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-foundation-700">
                Ask me about your account.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => fire(s)}
                  disabled={mutation.isPending}
                  className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12.5px] text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => {
            const mine = t.role === "user";
            return (
              <div
                key={`${t.createdAt}-${i}`}
                className={`flex items-end gap-2 ${
                  mine ? "justify-end" : "justify-start"
                }`}
              >
                {!mine && (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                )}
                <div
                  className={`flex max-w-[75%] flex-col gap-1.5 ${
                    mine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-3 py-2 text-[13.5px] ${
                      mine
                        ? "bg-foundation-700 text-paper"
                        : "bg-foundation-700/5 text-foundation-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{t.content}</p>
                    <p
                      className={`mt-1 text-[10.5px] ${
                        mine ? "text-paper/70" : "text-ink-muted"
                      }`}
                    >
                      {new Date(t.createdAt).toLocaleTimeString("en-NG", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!mine && t.actions && t.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.actions.map((a) => (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => router.push(a.web)}
                          className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[12.5px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                        >
                          {a.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {mutation.isPending && (
          <div className="flex items-end gap-2 justify-start">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="max-w-[75%] rounded-2xl bg-foundation-700/5 px-3 py-2 text-[13.5px] text-ink-muted">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-pulse">…</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (value.length === 0 || mutation.isPending) return;
          setText("");
          fire(value);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask the assistant…"
          className="flex-1 rounded-full border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
        />
        <button
          type="submit"
          disabled={text.trim().length === 0 || mutation.isPending}
          className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />{" "}
          {mutation.isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
