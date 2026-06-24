"use client";

import { useState } from "react";
import { CalendarDays, Check, MessageCircle } from "lucide-react";

// Sales WhatsApp number in international format (no +). Local: 0902 778 8838.
const WHATSAPP_NUMBER = "2349027788838";

const ROLES = [
  { value: "landlord", label: "Landlord" },
  { value: "agent", label: "Property Manager / Agent" },
  { value: "tenant", label: "Tenant" },
];

type Fields = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  preferredAt: string;
  message: string;
};

function buildWhatsAppLink(f: Fields) {
  const roleLabel = ROLES.find((r) => r.value === f.role)?.label ?? f.role;
  const lines = [
    `Hi Property360, I'd like to request a demo.`,
    f.fullName ? `Name: ${f.fullName}` : "",
    roleLabel ? `I am a: ${roleLabel}` : "",
    f.email ? `Email: ${f.email}` : "",
    f.phone ? `Phone: ${f.phone}` : "",
    f.preferredAt ? `Preferred time: ${f.preferredAt}` : "",
    f.message ? `Interested in: ${f.message}` : "",
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

export function RequestDemoForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waLink = buildWhatsAppLink({
    fullName,
    email,
    phone,
    role,
    preferredAt,
    message,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !role) {
      setError("Please tell us your name and which role describes you.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That email address doesn't look right.");
      return;
    }
    if (!agreed) {
      setError("Please agree to be contacted about the demo.");
      return;
    }

    // WhatsApp-first: open the chat prefilled with the request details.
    window.open(waLink, "_blank", "noopener,noreferrer");
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-foundation-700/10 bg-surface p-8 md:p-10">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-cryola-300 text-foundation-700">
          <Check className="h-6 w-6" strokeWidth={3} />
        </span>
        <h2 className="mt-5 text-[24px] font-bold tracking-[-0.01em] text-foundation-700">
          We&apos;ve opened WhatsApp.
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
          Thanks, {fullName.split(" ")[0] || "there"}. Send the prefilled message
          and our team will pick it up and confirm your demo. If WhatsApp
          didn&apos;t open, use the button below.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-foundation-800"
        >
          <MessageCircle className="h-4 w-4" />
          Open WhatsApp
        </a>
      </div>
    );
  }

  const fieldClass =
    "mt-2 w-full rounded-xl border border-foundation-700/15 bg-paper px-4 py-3 text-[14.5px] text-foundation-700 placeholder:text-ink-muted/60 transition focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-cryola-300/40";
  const labelClass = "text-[13px] font-semibold text-foundation-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-foundation-700/10 bg-surface p-7 md:p-9"
    >
      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-foundation-700">
        Book your session
      </h2>
      <p className="mt-2 text-[13.5px] leading-[1.5] text-ink-muted">
        Fill this in and we&apos;ll continue on WhatsApp to lock a time.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className={labelClass} htmlFor="rd-name">
            Full name *
          </label>
          <input
            id="rd-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className={fieldClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rd-email">
              Email address
            </label>
            <input
              id="rd-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rd-phone">
              Phone number
            </label>
            <input
              id="rd-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0801 234 5678"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rd-role">
              I am a *
            </label>
            <select
              id="rd-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={fieldClass}
              required
            >
              <option value="" disabled>
                Select one
              </option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rd-when">
              Preferred date &amp; time
            </label>
            <input
              id="rd-when"
              type="datetime-local"
              value={preferredAt}
              onChange={(e) => setPreferredAt(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="rd-message">
            What would you like to see in the demo?
          </label>
          <textarea
            id="rd-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Tell us about your portfolio and the features you're most interested in…"
            className={`${fieldClass} resize-y`}
          />
        </div>

        <label className="flex items-start gap-3 text-[13.5px] leading-[1.5] text-ink-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-foundation-700/30 accent-foundation-700"
          />
          <span>
            I agree to be contacted about the demo and accept the{" "}
            <a href="/terms" className="font-semibold text-foundation-700 underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-semibold text-foundation-700 underline">
              Privacy Policy
            </a>
            . *
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foundation-700 px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-foundation-800"
        >
          <MessageCircle className="h-4 w-4" />
          Request demo on WhatsApp
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          Sessions run 30 to 45 minutes.
        </p>
      </div>
    </form>
  );
}
