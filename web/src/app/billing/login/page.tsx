"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { billingApi } from "@/lib/billing-api";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/billing";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await billingApi.login(email.trim().toLowerCase(), password);
      router.replace(next.startsWith("/billing") ? next : "/billing");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Sign-in failed. Check your email and password.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto flex max-w-md flex-col px-6 pt-16 pb-24">
        <p className="eyebrow">Billing</p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Sign in to manage your plan.
        </h1>
        <p className="mt-3 text-[15px] text-ink-muted">
          Use the same email and password you use on the Property360 app.
          Subscriptions are for landlords and property managers.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="eyebrow block text-[10px]">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-4 py-2.5 text-[14.5px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
              placeholder="you@property360.africa"
            />
          </label>

          <label className="block">
            <span className="eyebrow block text-[10px]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-[13px] text-ink-muted">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/onboarding/role"
            className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Create one
          </Link>
          {" "}or grab the{" "}
          <Link
            href="/#download"
            className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            mobile app
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

export default function BillingLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginInner />
    </Suspense>
  );
}
