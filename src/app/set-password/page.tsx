"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";

/**
 * Set-password landing for accounts created over WhatsApp. The registration
 * email links here with a single-use ?token=. We redeem it for a real session
 * and route the user into their dashboard. Expired/used tokens fall back to
 * the normal forgot-password flow (their email is already verified).
 */
function SetPasswordInner() {
  const router = useRouter();
  const token = useSearchParams()?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This link is missing its token. Please use the link from your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.redeemPasswordSetup(token, password);
      router.replace(res.user.role === "tenant" ? "/me" : "/app/dashboard");
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not set your password.")
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto flex max-w-md flex-col px-6 pb-24 pt-16">
        <p className="eyebrow">Almost there</p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Set your password.
        </h1>
        <p className="mt-3 text-[15px] text-ink-muted">
          Your account was created over WhatsApp. Choose a password to sign in on
          the web and in the app.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="eyebrow block text-[10px]">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-4 py-2.5 text-[14.5px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
              placeholder="••••••••"
            />
          </label>

          <label className="block">
            <span className="eyebrow block text-[10px]">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-4 py-2.5 text-[14.5px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-foundation-700 px-6 py-3 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Set password"}
          </button>
        </form>

        <p className="mt-8 text-[13px] text-ink-muted">
          Link expired or already used? Email{" "}
          <a
            href="mailto:hello@property360.africa"
            className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            hello@property360.africa
          </a>{" "}
          for a new one, or{" "}
          <Link
            href="/login"
            className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            sign in
          </Link>{" "}
          if you already set a password.
        </p>
      </section>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <SetPasswordInner />
    </Suspense>
  );
}
