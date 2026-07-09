"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Send, Sparkles } from "lucide-react";
import { salesApi, SalesAction, getSalesSessionId } from "@/lib/sales-api";

// Standalone, full-screen version of the sales assistant, served at /chat as a
// shareable link and paid-ad landing page. It reuses the same public backend,
// lead gate, CTA actions and WhatsApp handoff as the floating widget. The chat
// logic is intentionally a self-contained copy so the production widget stays
// untouched; the shared client (salesApi, session id, SalesAction) is imported.

// PostHog shim: capture if the SDK is present, no-op otherwise.
function track(event: string, props?: object) {
  if (typeof window === "undefined") return;
  (
    window as unknown as {
      posthog?: { capture?: (e: string, p?: object) => void };
    }
  ).posthog?.capture?.(event, props);
}

// Fire the ad-conversion signal on lead-gate completion so Meta/PostHog can
// optimize toward leads. Both no-op until their SDK actually loads on the page.
function fireLeadConversion(attribution: Attribution) {
  if (typeof window === "undefined") return;
  (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "Lead", {
    content_name: "sales_chat",
  });
  track("salesbot_lead_captured", { via: "chat_page", ...attribution });
}

// Shared with the floating widget on purpose: a visitor who already gave their
// details in the bubble is not re-gated here, and vice versa.
const LEAD_DONE_KEY = "p360.salesbot.leadDone";

const QUICK_QUESTIONS = [
  "What does Property360 cost?",
  "How does rent collection work?",
  "I manage properties for landlords. What's in it for me?",
];

const GREETING =
  "Hi! I'm the Property360 assistant. I help landlords and property " +
  "managers collect rent on time and run their properties without the " +
  "spreadsheet stress. What would you like to know?";

// Real team member (not the WhatsApp assistant bot). Used when the API is
// unreachable or the assistant is switched off so visitors can still reach us.
const WHATSAPP_FALLBACK =
  "https://wa.me/2348130416934?text=" +
  encodeURIComponent("Hi, I have a question about Property360.");

interface Msg {
  role: "user" | "assistant";
  content: string;
  actions?: SalesAction[];
  failed?: boolean;
}

interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPath?: string;
  referrer?: string;
}

// Read ad attribution off the landing URL once, so leads created from a
// campaign carry their source through to the CRM and the conversion event.
function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k)?.slice(0, 200) || undefined;
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
    utmTerm: pick("utm_term"),
    landingPath: (window.location.pathname + window.location.search).slice(0, 300),
    referrer: document.referrer ? document.referrer.slice(0, 200) : undefined,
  };
}

export function SalesChatPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [leadDone, setLeadDone] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [gName, setGName] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attribution = useRef<Attribution>({});

  // Enabled probe + transcript restore, and snapshot the ad attribution.
  useEffect(() => {
    attribution.current = readAttribution();
    let cancelled = false;
    getSalesSessionId();
    if (localStorage.getItem(LEAD_DONE_KEY) === "1") setLeadDone(true);
    track("salesbot_chat_page_view", { ...readAttribution() });
    salesApi
      .getHistory()
      .then((h) => {
        if (cancelled) return;
        setEnabled(h.enabled);
        if (h.leadCaptured) {
          localStorage.setItem(LEAD_DONE_KEY, "1");
          setLeadDone(true);
        }
        if (h.messages.length > 0) {
          setMessages(h.messages.map((m) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(true); // fail open; sends surface their own errors
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, pending]);

  async function fire(raw: string) {
    const value = raw.trim();
    if (!value || pending || gateBusy) return;
    setMessages((m) => [...m, { role: "user", content: value }]);
    setText("");
    if (!leadDone) {
      setPendingText(value);
      setGateOpen(true);
      track("salesbot_gate_shown", { surface: "chat_page" });
      return;
    }
    await deliver(value);
  }

  async function deliver(value: string) {
    setLastFailedText(null);
    setPending(true);
    track("salesbot_message_sent", { surface: "chat_page" });
    try {
      const res = await salesApi.send(value, "/chat");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.reply, actions: res.actions },
      ]);
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

  async function submitGate() {
    const name = gName.trim();
    const phone = gPhone.trim();
    const email = gEmail.trim();
    if (!name) {
      setGateError("Please enter your name");
      return;
    }
    if (!phone && !email) {
      setGateError("Add your WhatsApp number or email");
      return;
    }
    setGateBusy(true);
    setGateError(null);
    try {
      await salesApi.captureLead({
        name,
        phone: phone || undefined,
        email: email || undefined,
        attribution: attribution.current,
      });
      localStorage.setItem(LEAD_DONE_KEY, "1");
      setLeadDone(true);
      setGateOpen(false);
      fireLeadConversion(attribution.current);
      const value = pendingText;
      setPendingText(null);
      if (value) await deliver(value);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setGateError(msg ?? "Could not save your details. Please try again.");
    } finally {
      setGateBusy(false);
    }
  }

  function onAction(a: SalesAction) {
    if (a.key === "signup") track("salesbot_signup_clicked", { surface: "chat_page" });
    if (a.web.startsWith("http")) {
      window.open(a.web, "_blank", "noopener,noreferrer");
    } else {
      router.push(a.web);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[620px] flex-col bg-paper">
      {/* Brand header */}
      <header className="flex items-center gap-3 bg-foundation-700 px-4 py-3 text-paper">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper/15">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold leading-tight">Property360 Assistant</p>
          <p className="flex items-center gap-1.5 text-[11.5px] text-paper/70 leading-tight">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            Online 24/7
          </p>
        </div>
      </header>

      {/* Hero: keeps the page reading as a real landing, not a bare chat box */}
      <section className="border-b border-foundation-700/10 px-5 pb-4 pt-5">
        <h1 className="text-[22px] font-semibold leading-snug text-foundation-700">
          Rent collected on time. Properties run without the stress.
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          Ask our assistant anything about Property360, then start free. A real person on
          our team is one tap away whenever you want one.
        </p>
      </section>

      {enabled === false ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-[14px] text-ink-muted">
            Our assistant is taking a short break. Our team can still help you right now.
          </p>
          <a
            href={WHATSAPP_FALLBACK}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-foundation-700 px-5 py-2.5 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Chat with us on WhatsApp
          </a>
        </div>
      ) : (
        <>
          {/* Thread */}
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
            <Bubble role="assistant" content={GREETING} />
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pl-9">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => fire(q)}
                    disabled={pending || enabled === null}
                    className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-left text-[12.5px] text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-3 py-1.5 text-[12.5px] font-medium text-paper transition hover:bg-foundation-800"
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
                        onClick={() => deliver(lastFailedText)}
                        className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12.5px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                      >
                        Try again
                      </button>
                    )}
                    <a
                      href={WHATSAPP_FALLBACK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12.5px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
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
            className="flex items-center gap-2 border-t border-foundation-700/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              fire(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Type your question…"
              disabled={enabled === null}
              className="flex-1 rounded-full border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={text.trim().length === 0 || pending || enabled === null}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}

      {/* Footer: navigation + privacy keep the landing compliant with ad review */}
      <footer className="flex items-center justify-center gap-3 border-t border-foundation-700/10 px-4 py-2.5 text-[11.5px] text-ink-muted">
        <a href="/" className="transition hover:text-foundation-700">
          property360.africa
        </a>
        <span aria-hidden>·</span>
        <a href="/privacy" className="transition hover:text-foundation-700">
          Privacy
        </a>
        <span aria-hidden>·</span>
        <a href="/terms" className="transition hover:text-foundation-700">
          Terms
        </a>
      </footer>

      {/* Lead gate: held before the first answer, same contract as the widget */}
      {gateOpen && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end bg-foundation-900/40">
          <div className="mx-auto w-full max-w-[620px] rounded-t-2xl bg-paper p-5 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foundation-700/15" />
            <h4 className="text-center text-[18px] font-semibold text-foundation-700">
              Let&apos;s get started
            </h4>
            <p className="mt-1 text-center text-[13px] text-ink-muted">
              Enter your details so I can give you priority service.
            </p>
            <div className="mt-4 space-y-2.5">
              <input
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                maxLength={80}
                placeholder="What's your name?"
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none"
              />
              <input
                value={gPhone}
                onChange={(e) => setGPhone(e.target.value)}
                inputMode="tel"
                maxLength={16}
                placeholder="WhatsApp number (080...)"
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none"
              />
              <input
                value={gEmail}
                onChange={(e) => setGEmail(e.target.value)}
                inputMode="email"
                maxLength={120}
                placeholder="Email address (optional)"
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none"
              />
            </div>
            {gateError && (
              <p className="mt-2 text-center text-[12px] text-red-600">{gateError}</p>
            )}
            <button
              type="button"
              onClick={submitGate}
              disabled={gateBusy}
              className="mt-4 w-full rounded-full bg-foundation-700 py-3 text-[14px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {gateBusy ? "Saving…" : "Start chatting"}
            </button>
          </div>
        </div>
      )}
    </main>
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
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13.5px] ${
          mine ? "bg-foundation-700 text-paper" : "bg-foundation-700/5 text-foundation-700"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
