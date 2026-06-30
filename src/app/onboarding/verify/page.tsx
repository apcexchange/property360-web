"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { useOnboardingState } from "@/lib/onboarding-state";
import { authApi } from "@/lib/auth-api";
import { session } from "@/lib/session";
import { AxiosError } from "axios";

// Email-verification step. The first OTP is sent automatically by
// /auth/register; this page only needs a "resend code" button. On verify
// success the backend flips emailVerified=true on the user; we mirror that
// into the local session so the dashboard unblocks immediately.
export default function VerifyPage() {
  const router = useRouter();
  const { state, ready } = useOnboardingState();
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resentNotice, setResentNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Don't allow arriving here without a session, the user must have just
  // registered (or be re-routed here post-login because emailVerified=false).
  useEffect(() => {
    if (!ready) return;
    const token = session.getToken();
    if (!token) {
      router.replace("/onboarding/role");
    }
  }, [ready, router]);

  const email = state.email ?? session.getUser()?.email ?? "your email";

  async function resendCode() {
    setResending(true);
    setError(null);
    setResentNotice(null);
    try {
      await authApi.resendEmailVerification();
      setResentNotice("Code sent. Check your inbox.");
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not send code.")
      );
    } finally {
      setResending(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!otp) return;
    setVerifying(true);
    setError(null);
    try {
      await authApi.verifyEmail(otp.trim());
      router.push("/onboarding/done");
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

  return (
    <OnboardingShell currentStep="verify">
      <p className="eyebrow">Step 3</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Verify your email.
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-foundation-700">{email}</span>.
        Check your inbox (and spam folder, just in case).
      </p>

      <form onSubmit={onVerify} className="mt-8 space-y-4">
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
            autoFocus
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
            onClick={resendCode}
            disabled={resending}
            className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900 disabled:opacity-60"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </div>

        {resentNotice && !error && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-700">
            {resentNotice}
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {error}
          </p>
        )}
      </form>

      <div className="mt-10">
        <Link
          href="/onboarding/account"
          className="text-[13px] font-semibold text-ink-muted transition hover:text-foundation-700"
        >
          ← Use a different email
        </Link>
      </div>
    </OnboardingShell>
  );
}
