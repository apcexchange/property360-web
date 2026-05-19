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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial cover plate — left rail */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foundation-700 px-12 py-14 text-paper lg:flex">
        <div className="relative z-10">
          <div className="flex items-baseline">
            <span className="font-display text-[34px] font-medium leading-none tracking-[-0.035em] text-paper">
              Property
            </span>
            <span className="font-display text-[34px] font-medium leading-none tracking-[-0.035em] text-cryola-300">
              360
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="h-px w-8 bg-cryola-400" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300/90">
              Admin desk · Vol. I
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-display text-[42px] leading-[1.05] tracking-[-0.025em] text-paper">
            The ledger of <em className="text-cryola-300">Nigerian</em> rent.
          </p>
          <p className="mt-5 max-w-md font-display text-[15px] italic leading-snug text-foundation-200">
            Every payout, every lease, every tenant — recorded, reconciled,
            and ready for review by the morning desk.
          </p>
          <div className="mt-8 h-px w-full bg-foundation-600/70" />
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-450">
            Internal access only · Lagos, WAT
          </p>
        </div>

        {/* Faint serif watermark in the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -right-8 font-display text-[260px] font-medium leading-none text-foundation-600/40 select-none"
        >
          ₦
        </span>
      </aside>

      {/* Form column */}
      <main className="flex items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Link
            href="/"
            className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-faint hover:text-ink"
          >
            ← Property360 home
          </Link>

          <p className="mt-10 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Sign in
          </p>
          <h1 className="mt-2 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
            Take the desk.
          </h1>
          <p className="mt-3 font-display text-[15px] italic leading-snug text-ink-muted">
            Authenticate to enter the admin records.
          </p>

          <div className="mt-6 h-px w-full bg-rule-strong" />
          <div className="mt-[3px] h-px w-full bg-rule-strong" />

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full border-0 border-b border-rule-strong bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-foundation-700"
                placeholder="admin@property360.africa"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border-0 border-b border-rule-strong bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-foundation-700"
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="border border-error/30 bg-error/5 px-3 py-2 text-[12.5px] text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-3 w-full bg-foundation-700 px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper transition hover:bg-foundation-800 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Enter the desk"}
            </button>
          </form>

          <p className="mt-10 font-display text-[12.5px] italic text-ink-faint">
            For internal use by the Property360 operations team.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
