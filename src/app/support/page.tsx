import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MessageCircle, LifeBuoy, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Support, Property360",
  description:
    "Get help with the Property360 app. Contact our team, browse common questions, and find guides for landlords, tenants, and agents.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Support, Property360",
    description:
      "Get help with the Property360 app. Contact our team, browse common questions, and find guides for landlords, tenants, and agents.",
    url: "https://property360.africa/support",
    type: "website",
  },
};

export default function SupportPage() {
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
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
            <Link href="/delete-account" className="hover:text-foundation-700">Delete account</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl">
            Support
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            We&apos;re here to help. Most questions are answered within one business day.
          </p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@property360.africa"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-foundation-500"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foundation-700">Email us</h2>
              <p className="mt-1 text-sm text-ink-muted">
                support@property360.africa
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Best for account, payment, or lease questions.
              </p>
            </div>
          </a>

          <a
            href="https://wa.me/2348000000000"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-foundation-500"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foundation-700">WhatsApp</h2>
              <p className="mt-1 text-sm text-ink-muted">+234 800 000 0000</p>
              <p className="mt-1 text-xs text-ink-muted">
                Mon&ndash;Fri, 9am&ndash;6pm WAT.
              </p>
            </div>
          </a>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foundation-700">
            <LifeBuoy className="h-5 w-5" />
            Common questions
          </h2>

          <div className="mt-6 space-y-4">
            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                I&apos;m a tenant, how do I pay my rent?
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Open the Property360 app, tap <strong>Payments</strong>, and choose the
                invoice you want to pay. You can pay with a debit card, bank transfer, or
                USSD &mdash; all powered by Paystack. A receipt is saved to your account
                and emailed to you.
              </p>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                I&apos;m a landlord, how do I get my collected rent into my bank account?
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Collected rent lands in your in-app <strong>Wallet</strong>. From there,
                go to <strong>Wallet → Withdraw</strong>, choose a saved Nigerian bank
                account, and confirm. Payouts arrive within 1 business day.
              </p>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                How do I invite an agent to manage my property?
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Tap <strong>Agents → Invite agent</strong>, enter their email or phone
                number, then pick exactly which permissions you want them to have per
                property (add tenants, record payments, renew leases, etc.). They&apos;ll
                receive an invitation to download the app and accept.
              </p>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                I forgot my password.
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                On the login screen, tap <strong>Forgot password</strong>. We&apos;ll
                email you a one-time code to reset it. If you no longer have access to
                that email, contact us at{" "}
                <a
                  href="mailto:support@property360.africa"
                  className="text-foundation-700 underline-offset-2 hover:underline"
                >
                  support@property360.africa
                </a>
                {" "}from a number or address we can verify against your account.
              </p>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                How do I delete my account?
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                You can delete your account from inside the app
                (<strong>Profile → Delete account</strong>) or from our{" "}
                <Link
                  href="/delete-account"
                  className="text-foundation-700 underline-offset-2 hover:underline"
                >
                  account deletion page
                </Link>
                . We process requests within 30 days, in line with the Nigeria Data
                Protection Act.
              </p>
            </details>

            <details className="group rounded-2xl border border-border bg-surface p-5 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foundation-700">
                A payment failed but my account was charged.
              </summary>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Failed Paystack transactions are auto-reversed within 24 hours. If you
                still don&apos;t see the refund after that, email us at{" "}
                <a
                  href="mailto:support@property360.africa"
                  className="text-foundation-700 underline-offset-2 hover:underline"
                >
                  support@property360.africa
                </a>
                {" "}with the date, amount, and the email address on your account.
              </p>
            </details>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foundation-700">
            <Clock className="h-5 w-5" />
            Response times
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-ink-muted">
            <li>
              <strong className="text-foundation-700">Account &amp; payment issues:</strong>{" "}
              within 1 business day.
            </li>
            <li>
              <strong className="text-foundation-700">Privacy &amp; data requests:</strong>{" "}
              within 30 days, per the Nigeria Data Protection Act.
            </li>
            <li>
              <strong className="text-foundation-700">General questions:</strong>{" "}
              within 2 business days.
            </li>
          </ul>
        </section>

        <p className="mt-12 text-center text-sm text-ink-muted">
          For privacy-specific requests, email{" "}
          <a
            href="mailto:privacy@property360.africa"
            className="text-foundation-700 underline-offset-2 hover:underline"
          >
            privacy@property360.africa
          </a>
          .
        </p>
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Property360. Lagos, Nigeria.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
            <Link href="/delete-account" className="hover:text-foundation-700">Delete account</Link>
            <a href="mailto:support@property360.africa" className="hover:text-foundation-700">
              support@property360.africa
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
