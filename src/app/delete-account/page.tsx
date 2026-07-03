"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { AxiosError } from "axios";

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter the email address on your account.");
      return;
    }
    if (!agreed) {
      setError("Please confirm you understand what will be deleted.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/account-deletion-requests", {
        email: email.trim(),
        phone: phone.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not submit your request. Please try again."),
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-foundation-700">
      <header className="border-b border-border bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
              P
            </span>
            <span className="text-lg text-foundation-700">Property360</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink-muted">
            <Link href="/support" className="hover:text-foundation-700">Support</Link>
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl">
            Delete your account
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Last updated: 10 May 2026
          </p>
        </div>

        {done ? (
          <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />
              <div>
                <h2 className="text-xl font-semibold text-green-900">
                  Request received
                </h2>
                <p className="mt-2 text-sm leading-6 text-green-900">
                  We&apos;ve emailed a confirmation to <strong>{email}</strong>. Our team will
                  verify your request and complete the deletion within 30 days, in line with
                  the Nigeria Data Protection Act (NDPA).
                </p>
                <p className="mt-3 text-sm leading-6 text-green-900">
                  If you don&apos;t see the confirmation email, check your spam folder or
                  email{" "}
                  <a href="mailto:privacy@property360.africa" className="underline">
                    privacy@property360.africa
                  </a>{" "}
                  directly.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <article className="prose-legal mt-10 text-foundation-700">
              <p>
                You can request the deletion of your Property360 account at any time. There
                are two ways:
              </p>

              <h2>Option 1, From inside the app (fastest)</h2>
              <p>
                Open the Property360 mobile app → <strong>Profile</strong> → <strong>Delete account</strong>.
                Your request is logged immediately and we begin processing it the same day.
              </p>

              <h2>Option 2, From this page (use if you can&apos;t access the app)</h2>
              <p>
                Fill out the form below. We&apos;ll email you a confirmation and our team will
                verify and complete the request within <strong>30 days</strong>.
              </p>

              <h2>What gets deleted</h2>
              <ul>
                <li>Your name, email address, phone number, and profile photo</li>
                <li>Your in-app messages, maintenance requests, and notifications</li>
                <li>Your KYC selfie and ID document image (after the AML retention period, see below)</li>
                <li>Your authentication credentials and session tokens</li>
              </ul>

              <h2>What is retained, and why</h2>
              <p>
                Some records are retained even after your account is deleted, in line with
                Nigerian law:
              </p>
              <ul>
                <li>
                  <strong>Lease and tenancy records</strong> are <strong>anonymised</strong> rather
                  than hard-deleted, so the counterparty (landlord ↔ tenant) still has a complete
                  record of the agreement they signed with you. These records cannot be linked
                  back to you after deletion.
                </li>
                <li>
                  <strong>KYC documents</strong> are retained for <strong>5 years</strong> after the
                  end of the relationship for anti-money-laundering compliance, then deleted.
                </li>
                <li>
                  <strong>Payment records</strong> are retained for <strong>7 years</strong> to meet
                  Nigerian tax and accounting obligations.
                </li>
              </ul>
              <p>
                See our{" "}
                <a href="/privacy">privacy policy</a> for the full retention schedule.
              </p>
            </article>

            <form
              onSubmit={onSubmit}
              className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-card"
            >
              <h3 className="text-lg font-semibold text-foundation-700">
                Submit a deletion request
              </h3>
              <p className="mt-1 text-sm text-ink-muted">
                We&apos;ll email a confirmation to the address you enter below.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Email on your account
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foundation-700 outline-none transition focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Phone number (optional)
                  </label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foundation-700 outline-none transition focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
                    placeholder="+234…"
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    Helps us locate your account faster.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Reason (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foundation-700 outline-none transition focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200"
                    placeholder="Tell us why if you'd like, it helps us improve."
                  />
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-border bg-canvas p-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 accent-foundation-700"
                  />
                  <span className="text-sm text-foundation-700">
                    I understand that my personal identifiers will be removed, that lease and
                    payment records will be retained as described above, and that this action
                    cannot be undone.
                  </span>
                </label>

                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-foundation-700 px-4 py-2.5 text-sm font-semibold text-cryola-50 shadow-card transition hover:bg-foundation-800 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Request account deletion"}
                </button>

                <p className="text-center text-xs text-ink-muted">
                  Questions? Email{" "}
                  <a
                    href="mailto:privacy@property360.africa"
                    className="text-foundation-700 underline-offset-2 hover:underline"
                  >
                    privacy@property360.africa
                  </a>
                  .
                </p>
              </div>
            </form>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Property360. Lagos, Nigeria.</p>
          <div className="flex items-center gap-5">
            <Link href="/support" className="hover:text-foundation-700">Support</Link>
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
            <a href="mailto:privacy@property360.africa" className="hover:text-foundation-700">
              privacy@property360.africa
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
