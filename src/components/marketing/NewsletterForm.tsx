"use client";

import { useState } from "react";
import { subscribeNewsletter, type NewsletterSource } from "@/lib/newsletter-api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  source,
  variant = "block",
}: {
  source: NewsletterSource;
  variant?: "footer" | "block";
}) {
  const [email, setEmail] = useState("");
  // Honeypot — bots fill hidden fields; humans never see it.
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (company) return; // honeypot tripped — silently drop
    if (!EMAIL_RE.test(email.trim())) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setState("loading");
    const res = await subscribeNewsletter({ email: email.trim(), source });
    if (res.ok) {
      setState("ok");
      setMessage("You're in. Check your inbox.");
      setEmail("");
    } else {
      setState("error");
      setMessage(res.message ?? "Something went wrong. Try again.");
    }
  }

  const isFooter = variant === "footer";

  return (
    <form onSubmit={onSubmit} className={isFooter ? "mt-4" : "mt-6 max-w-md"}>
      <div className={isFooter ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          disabled={state === "loading" || state === "ok"}
          className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none placeholder:text-ink-muted focus:border-cryola-500"
        />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "ok"}
          className="shrink-0 rounded-lg bg-cryola-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-cryola-400 disabled:opacity-60"
        >
          {state === "loading" ? "…" : state === "ok" ? "Subscribed" : "Subscribe"}
        </button>
      </div>
      {message ? (
        <p className={`mt-2 text-[12.5px] ${state === "error" ? "text-red-600" : "text-ink-muted"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
