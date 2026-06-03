"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { X, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";

interface Props {
  open: boolean;
  phone: string;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * In-app phone verification dialog. Sends a Termii SMS code to the user's
 * phone when it opens, then collects the 6-digit code. On success flips
 * phoneVerified=true on the user (handled by authApi.verifyPhone).
 */
export function PhoneVerifyModal({ open, phone, onClose, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      setResendNotice(null);
      sentRef.current = false;
      return;
    }
    // Auto-send on open, but only once per open cycle (StrictMode would
    // otherwise fire two SMS).
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      await authApi.sendPhoneVerification();
      setResendNotice("Code sent. Check your text messages.");
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-extrabold tracking-tight text-foundation-700">
                Verify your phone
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                We sent a code to{" "}
                <span className="font-semibold text-foundation-700">
                  {phone}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="eyebrow block text-[10px]">6-digit code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
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
              onClick={sendCode}
              disabled={sending}
              className="text-[12.5px] font-semibold text-foundation-700 transition hover:text-foundation-900 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Resend code"}
            </button>
          </div>

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
    </div>
  );
}
