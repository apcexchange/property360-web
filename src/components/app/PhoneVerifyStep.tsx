"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";
import { useCountdown } from "@/lib/useCountdown";

interface Props {
  phone: string;
  /** Called after authApi.verifyPhone flips phoneVerified on the session. */
  onVerified: () => void;
}

/**
 * The reusable phone-verification body (no modal chrome). Sends a WhatsApp-first
 * OTP on mount (backend may fall back to SMS), collects the 6-digit code, offers
 * a manual channel switch, and surfaces the 60s resend cooldown as a live mm:ss
 * countdown plus a code-expiry note. Composed by both PhoneVerifyModal (step 1
 * of the standalone flow) and VerifyAccountModal (the unified flow).
 */
export function PhoneVerifyStep({ phone, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelUsed, setChannelUsed] = useState<"whatsapp" | "sms">("whatsapp");
  const cooldown = useCountdown();
  const sentRef = useRef(false);

  useEffect(() => {
    // Auto-send once on mount. The ref guards against StrictMode double-firing
    // the effect for the same instance.
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode("whatsapp");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single deletion point for when PostHog lands on this branch.
  const capture = (event: string, props?: object) =>
    (window as unknown as { posthog?: { capture?: (e: string, p?: object) => void } })
      .posthog?.capture?.(event, props);

  async function sendCode(channel: "whatsapp" | "sms") {
    setSending(true);
    setError(null);
    try {
      const { channelUsed: used } = await authApi.sendPhoneVerification(channel);
      setChannelUsed(used);
      cooldown.start(60);
      setResendNotice(
        used === "whatsapp"
          ? "Code sent to your WhatsApp."
          : "Code sent by SMS. Check your text messages."
      );
      capture("phone_otp_sent", { channel: used });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not send code.")
      );
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    setVerifying(true);
    setError(null);
    try {
      await authApi.verifyPhone(code.trim());
      capture("phone_otp_verified", { channel: channelUsed });
      onVerified();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Verification failed.")
      );
    } finally {
      setVerifying(false);
    }
  }

  const resendLabel = cooldown.active
    ? `Resend in ${cooldown.mmss}`
    : "Resend code";

  return (
    <div>
      <p className="text-[12.5px] text-ink-muted">
        {channelUsed === "whatsapp" ? (
          <>
            Enter the 6-digit code sent to your WhatsApp on{" "}
            <span className="font-semibold text-foundation-700">{phone}</span>.
          </>
        ) : (
          <>
            Enter the 6-digit code sent by SMS to{" "}
            <span className="font-semibold text-foundation-700">{phone}</span>.
          </>
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="eyebrow block text-[10px]">6-digit code</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="123456"
            autoFocus
            className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-5 py-3 text-center text-[20px] font-semibold tracking-[0.5em] text-foundation-700 outline-none transition focus:border-foundation-700/40"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={verifying || code.length < 4}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => sendCode(channelUsed)}
            disabled={sending || verifying || cooldown.active}
            className="text-[12.5px] font-semibold text-foundation-700 transition hover:text-foundation-900 disabled:opacity-60"
          >
            {sending ? "Sending…" : resendLabel}
          </button>
          <button
            type="button"
            onClick={() =>
              sendCode(channelUsed === "whatsapp" ? "sms" : "whatsapp")
            }
            disabled={sending || verifying || cooldown.active}
            className="text-[12.5px] font-semibold text-ink-muted underline-offset-2 transition hover:text-foundation-700 hover:underline disabled:opacity-60"
          >
            {cooldown.active
              ? `Switch available in ${cooldown.mmss}`
              : channelUsed === "whatsapp"
                ? "Send by SMS instead"
                : "Send to WhatsApp instead"}
          </button>
        </div>

        <p className="text-[11.5px] text-ink-muted">
          The code expires in 10 minutes.
        </p>

        {resendNotice && !error && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-700">
            {resendNotice}
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
