"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";

/**
 * General-purpose web sign-in. Authenticates any role, then routes:
 *   - landlord / agent (property manager) → /app/dashboard (or `next`)
 *   - tenant → /me (or `next` if it points into /me)
 *
 * The `next` querystring param wins as long as it points back into the
 * site (starts with /) and matches the user's role-appropriate area.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params?.get("next") ?? null;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function safeNext(role: string): string {
    if (nextParam && nextParam.startsWith("/")) {
      if (role === "tenant") {
        if (nextParam.startsWith("/me") || nextParam.startsWith("/listings")) {
          return nextParam;
        }
        return "/me";
      }
      return nextParam;
    }
    return role === "tenant" ? "/me" : "/app/dashboard";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.login(identifier.trim(), password);
      // Email verification is enforced only in the self-service onboarding
      // flow, not at sign-in. Returning users (incl. mobile-registered and
      // landlord-created tenants) sign straight in; gating here locked them
      // out. See web AppAuthGate / me AuthGate and backfillEmailVerified.
      router.replace(safeNext(res.user.role));
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error
            ? err.message
            : "Sign-in failed. Check your email and password.")
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto flex max-w-md flex-col px-6 pb-24 pt-16">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Sign in to Property360.
        </h1>
        <p className="mt-3 text-[15px] text-ink-muted">
          Use the same email (or phone) and password you set up with on the
          mobile app or during web onboarding.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="eyebrow block text-[10px]">Email or phone</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
          .
        </p>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginInner />
    </Suspense>
  );
}
