"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { useOnboardingState } from "@/lib/onboarding-state";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";

export default function VerifyPage() {
  const router = useRouter();
  const { state, update, ready } = useOnboardingState();
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!state.registered || !state.phone) {
      router.replace("/onboarding/role");
    }
  }, [ready, state, router]);

  async function sendCode() {
    if (!state.phone) return;
    setSending(true);
    setError(null);
    try {
      await authApi.sendOtp("phone", state.phone);
      setSent(true);
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

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!state.phone || !otp) return;
    setVerifying(true);
    setError(null);
    try {
      const ok = await authApi.verifyOtp("phone", state.phone, otp.trim());
      if (!ok) {
        setError("That code didn't match. Try again.");
        return;
      }
      update({ phoneVerified: true });
      next();
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

  function next() {
    if (state.role === "landlord") router.push("/onboarding/plan");
    else router.push("/onboarding/done");
  }

  function skip() {
    next();
  }

  return (
    <OnboardingShell
      currentStep="verify"
      includesPlan={state.role === "landlord"}
    >
      <p className="eyebrow">Step 3</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Verify your phone.
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        We&apos;ll text a code to{" "}
        <span className="font-semibold text-foundation-700">
          {state.phone ?? "your number"}
        </span>
        . Verifying helps your landlords / tenants / agents trust they&apos;re talking
        to you.
      </p>

      <div className="mt-8 space-y-4">
        {!sent ? (
          <button
            type="button"
            onClick={sendCode}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {sending ? "Sending code…" : "Send verification code"}
          </button>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            <label className="block">
              <span className="eyebrow block text-[10px]">6-digit code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="123456"
                className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-5 py-3 text-center text-[20px] font-semibold tracking-[0.5em] text-foundation-700 outline-none transition focus:border-foundation-700/40"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={verifying || otp.length < 4}
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify →"}
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={sending}
                className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/onboarding/account"
          className="text-[13px] font-semibold text-ink-muted transition hover:text-foundation-700"
        >
          ← Back
        </Link>
        <button
          type="button"
          onClick={skip}
          className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900"
        >
          Skip for now →
        </button>
      </div>
    </OnboardingShell>
  );
}
