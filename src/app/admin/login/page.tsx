"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import adminApi from "@/lib/admin";
import { AxiosError } from "axios";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.login(email, password);
      router.replace("/admin");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const apiMsg = axiosErr.response?.data?.message;
      setError(apiMsg ?? (err instanceof Error ? err.message : "Login failed."));
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-pop">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 font-semibold tracking-tight text-foundation-700"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
            P
          </span>
          <span>Property360 Admin</span>
        </Link>

        <h1 className="text-2xl font-semibold text-foundation-700">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Internal access only.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foundation-700 outline-none transition focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
              placeholder="admin@property360.africa"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foundation-700 outline-none transition focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-foundation-700 px-4 py-2.5 text-sm font-semibold text-cryola-50 shadow-card transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-xs text-ink-muted hover:text-foundation-500"
        >
          ← Back to website
        </Link>
      </div>
    </div>
  );
}
