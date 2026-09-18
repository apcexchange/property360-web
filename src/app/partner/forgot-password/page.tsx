"use client";

import { useState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { authApi } from "@/lib/auth-api";
import { AxiosError } from "axios";

type Step = "request" | "confirm" | "done";

export default function PartnerForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apiMessage = (err: unknown, fallback: string): string => {
    const axiosErr = err as AxiosError<{ message?: string }>;
    return (
      axiosErr.response?.data?.message ??
      (err instanceof Error ? err.message : fallback)
    );
  };

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(email.trim().toLowerCase());
      setNotice("If that email has an account, a 6-digit code is on its way.");
      setStep("confirm");
    } catch (err) {
      setError(apiMessage(err, "Could not send the code. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || !password) {
      setError("Enter the code and your new password.");
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
      await authApi.confirmPasswordReset(
        email.trim().toLowerCase(),
        otp.trim(),
        password
      );
      setStep("done");
    } catch (err) {
      setError(apiMessage(err, "Invalid or expired code. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial cover plate, left rail */}
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
              Partner portal
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-display text-[42px] leading-[1.05] tracking-[-0.025em] text-paper">
            Back to your <em className="text-cryola-300">earnings</em> in a
            moment.
          </p>
          <p className="mt-5 max-w-md font-display text-[15px] italic leading-snug text-foundation-200">
            We&apos;ll email you a code to reset your password. It expires
            shortly, so use it soon.
          </p>
          <div className="mt-8 h-px w-full bg-foundation-600/70" />
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-450">
            Property360 partner program
          </p>
        </div>

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
            href="/partner/login"
            className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-faint hover:text-ink"
          >
            ← Back to sign in
          </Link>

          <p className="mt-10 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Reset password
          </p>
          <h1 className="mt-2 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.025em] text-ink">
            {step === "done" ? "All set." : "Forgot password."}
          </h1>

          {step === "request" && (
            <>
              <p className="mt-3 font-display text-[15px] italic leading-snug text-ink-muted">
                Enter your partner email and we&apos;ll send a reset code.
              </p>
              <Rules />
              <form onSubmit={onRequest} className="mt-8 space-y-5">
                <Field label="Email">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                </Field>
                {error && <ErrorNote>{error}</ErrorNote>}
                <SubmitButton submitting={submitting}>
                  {submitting ? "Sending…" : "Send reset code"}
                </SubmitButton>
              </form>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="mt-3 font-display text-[15px] italic leading-snug text-ink-muted">
                Enter the code sent to{" "}
                <span className="not-italic text-ink">{email}</span> and choose
                a new password.
              </p>
              <Rules />
              {notice && (
                <p className="mt-4 border border-foundation-600/20 bg-foundation-700/5 px-3 py-2 text-[12.5px] text-ink-muted">
                  {notice}
                </p>
              )}
              <form onSubmit={onConfirm} className="mt-6 space-y-5">
                <Field label="Reset code">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={inputCls}
                    placeholder="6-digit code"
                  />
                </Field>
                <Field label="New password">
                  <PasswordInput
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={passwordInputCls}
                    toggleClassName={toggleCls}
                    placeholder="At least 6 characters"
                  />
                </Field>
                <Field label="Confirm new password">
                  <PasswordInput
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={passwordInputCls}
                    toggleClassName={toggleCls}
                    placeholder="Re-enter password"
                  />
                </Field>
                {error && <ErrorNote>{error}</ErrorNote>}
                <SubmitButton submitting={submitting}>
                  {submitting ? "Resetting…" : "Reset password"}
                </SubmitButton>
              </form>
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setError(null);
                  setNotice(null);
                }}
                className="mt-5 text-[12.5px] text-ink-muted underline decoration-rule-strong underline-offset-4 transition hover:text-ink"
              >
                Use a different email
              </button>
            </>
          )}

          {step === "done" && (
            <>
              <p className="mt-3 font-display text-[15px] italic leading-snug text-ink-muted">
                Your password has been reset. You can now sign in with your new
                password.
              </p>
              <div className="mt-8 h-px w-full bg-rule-strong" />
              <Link
                href="/partner/login"
                className="mt-8 inline-flex w-full items-center justify-center bg-foundation-700 px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper transition hover:bg-foundation-800"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "block w-full border-0 border-b border-rule-strong bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-foundation-700";
const passwordInputCls =
  "block w-full border-0 border-b border-rule-strong bg-transparent pl-0 pr-7 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-foundation-700";
const toggleCls =
  "absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-faint transition hover:text-ink-muted";

function Rules() {
  return (
    <>
      <div className="mt-6 h-px w-full bg-rule-strong" />
      <div className="mt-[3px] h-px w-full bg-rule-strong" />
    </>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-error/30 bg-error/5 px-3 py-2 text-[12.5px] text-error">
      {children}
    </p>
  );
}

function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="mt-3 w-full bg-foundation-700 px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper transition hover:bg-foundation-800 disabled:opacity-60"
    >
      {children}
    </button>
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
