"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, MessageCircle, Send, Sparkles, X } from "lucide-react";
import {
  salesApi,
  SalesAction,
  getSalesSessionId,
} from "@/lib/sales-api";

// PostHog shim: capture if the SDK is present, no-op otherwise (the SDK
// lands with the analytics branch; events start flowing automatically).
function track(event: string, props?: object) {
  if (typeof window === "undefined") return;
  (
    window as unknown as {
      posthog?: { capture?: (e: string, p?: object) => void };
    }
  ).posthog?.capture?.(event, props);
}

const QUICK_QUESTIONS = [
  "What does Property360 cost?",
  "How does rent collection work?",
  "I manage properties for landlords. What's in it for me?",
];

// Logged-in surfaces have the account assistant; hide the sales bot there.
const HIDDEN_PREFIXES = ["/app", "/me", "/admin"];

const WHATSAPP_FALLBACK =
  "https://wa.me/2349027788838?text=" +
  encodeURIComponent("Hi, I have a question about Property360.");

const GREETING =
  "Hi! I'm the Property360 assistant. I help landlords and property " +
  "managers collect rent on time and run their properties without the " +
  "spreadsheet stress. What would you like to know?";

interface Msg {
  role: "user" | "assistant";
  content: string;
  actions?: SalesAction[];
  failed?: boolean;
}

export function SalesChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  // One enabled-probe + transcript restore per mount. The GET is cheap (no
  // LLM); cache the kill-switch verdict for the tab session.
  useEffect(() => {
    if (hidden) return;
    const cached = sessionStorage.getItem("p360.salesbot.enabled");
    if (cached === "false") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cached kill-switch read, not derived render state
      setEnabled(false);
      return;
    }
    let cancelled = false;
    getSalesSessionId(); // ensure the id exists before any send
    salesApi
      .getHistory()
      .then((h) => {
        if (cancelled) return;
        sessionStorage.setItem("p360.salesbot.enabled", String(h.enabled));
        setEnabled(h.enabled);
        if (h.messages.length > 0) {
          setMessages(
            h.messages.map((m) => ({ role: m.role, content: m.content }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(true); // fail open for the bubble; sends have their own errors
      });
    return () => {
      cancelled = true;
    };
  }, [hidden]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, pending, open]);

  if (hidden || enabled === false) return null;

  async function fire(raw: string) {
    const value = raw.trim();
    if (!value || pending) return;
    setLastFailedText(null);
    setMessages((m) => [...m, { role: "user", content: value }]);
    setPending(true);
    track("salesbot_message_sent");
    try {
      const res = await salesApi.send(value, pathname ?? "/");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.reply, actions: res.actions },
      ]);
      if (res.leadCaptured) track("salesbot_lead_captured");
    } catch {
      setLastFailedText(value);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach our servers just now. Try again in a " +
            "moment, or chat with our team on WhatsApp.",
          failed: true,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onAction(a: SalesAction) {
    if (a.key === "signup") track("salesbot_signup_clicked");
    if (a.web.startsWith("http")) {
      window.open(a.web, "_blank", "noopener,noreferrer");
    } else {
      router.push(a.web);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-foundation-700/10 bg-paper shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-foundation-700 px-4 py-3 text-paper">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper/15">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold leading-tight">
                  Property360
                </p>
                <p className="text-[11px] text-paper/70 leading-tight">
                  Ask me anything about the product
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 transition hover:bg-paper/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Thread */}
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            <Bubble role="assistant" content={GREETING} />
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => fire(q)}
                    disabled={pending}
                    className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-left text-[12px] text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <Bubble role={m.role} content={m.content} />
                {m.role === "assistant" && m.actions && m.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-9">
                    {m.actions.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => onAction(a)}
                        className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-3 py-1.5 text-[12px] font-medium text-paper transition hover:bg-foundation-800"
                      >
                        {a.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}
                {m.failed && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-9">
                    {lastFailedText && (
                      <button
                        type="button"
                        onClick={() => fire(lastFailedText)}
                        className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                      >
                        Try again
                      </button>
                    )}
                    <a
                      href={WHATSAPP_FALLBACK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                    >
                      Chat on WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <div className="flex items-end gap-2">
                <BotAvatar />
                <div className="rounded-2xl bg-foundation-700/5 px-3 py-2 text-[13px] text-ink-muted">
                  <span className="animate-pulse">Typing…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            className="flex items-center gap-2 border-t border-foundation-700/10 p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const value = text.trim();
              if (!value || pending) return;
              setText("");
              fire(value);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Type your question…"
              className="flex-1 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[13.5px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={text.trim().length === 0 || pending}
              className="grid h-9 w-9 place-items-center rounded-full bg-foundation-700 text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close chat" : "Chat with us"}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) track("salesbot_opened", { page: pathname });
        }}
        className="grid h-14 w-14 place-items-center rounded-full bg-foundation-700 text-paper shadow-lg transition hover:bg-foundation-800"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}

function BotAvatar() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const mine = role === "user";
  return (
    <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <BotAvatar />}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] ${
          mine
            ? "bg-foundation-700 text-paper"
            : "bg-foundation-700/5 text-foundation-700"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
