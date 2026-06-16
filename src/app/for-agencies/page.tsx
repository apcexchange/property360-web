"use client";

import Link from "next/link";
import {
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  Sparkles,
  Printer,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

/**
 * Property360 for Property Management Agencies.
 *
 * A deliberate single-page artifact built for two uses at once:
 *  - On screen: a shareable URL the agency owner can scan in 60 seconds.
 *  - Printed (via "Save as PDF"): a forwardable one-pager that fits
 *    cleanly on one A4 sheet, no nav, no footer, no animation.
 *
 * If you change anything here, keep it printable. Run:
 *   open https://property360.africa/for-agencies
 * then Cmd-P → "Save as PDF" and make sure it lands on a single page.
 */
export default function ForAgenciesPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <div className="print:hidden">
        <Nav />
      </div>

      <main className="print:px-0 print:py-0">
        {/* On-screen "Save as PDF" hint, only visible on screen. */}
        <div className="mx-auto max-w-4xl px-6 pt-10 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foundation-700/10 bg-cryola-50/60 px-5 py-3">
            <p className="text-[12.5px] text-foundation-700">
              <span className="font-semibold">Forwardable one-pager.</span>{" "}
              Print or save as PDF and send to an agency owner.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-1.5 text-[11.5px] font-semibold text-paper hover:bg-foundation-800"
            >
              <Printer className="h-3.5 w-3.5" /> Save as PDF
            </button>
          </div>
        </div>

        <article className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-10 print:py-6">
          {/* Header — kept compact for print */}
          <header className="flex items-start justify-between gap-4 border-b border-foundation-700/15 pb-5">
            <div>
              <div className="flex items-baseline">
                <span className="font-display text-[28px] font-medium leading-none tracking-[-0.035em] text-foundation-700">
                  Property
                </span>
                <span className="font-display text-[28px] font-medium leading-none tracking-[-0.035em] text-cryola-500">
                  360
                </span>
              </div>
              <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                For property management agencies
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Web
              </p>
              <p className="mt-0.5 font-mono text-[12px] text-foundation-700">
                property360.africa
              </p>
              <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Email
              </p>
              <p className="mt-0.5 font-mono text-[12px] text-foundation-700">
                hello@property360.africa
              </p>
            </div>
          </header>

          {/* Lede */}
          <section className="pt-6">
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
              The software for the agency,{" "}
              <span className="text-cryola-500">
                the dashboard for each landlord.
              </span>
            </h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-[1.55] text-ink-muted">
              Property360 lets a property management agency run rent collection,
              lease signing, maintenance, and payouts across many landlords
              from one workspace — while each landlord keeps their own account
              and sees their own financials. Built in Nigeria for the way
              hostels, residential blocks, and short-let portfolios actually
              get managed.
            </p>
          </section>

          {/* 3 columns — agency / landlord / tenant */}
          <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Column
              icon={Briefcase}
              title="For your agency"
              bullets={[
                "One Manager desk across every landlord you act for.",
                "Granular permission flags per property (record payments, send leases, manage maintenance, view reports).",
                "Every action attributed — disputes resolved with one line in the audit log.",
                "Charge what you already charge. The platform doesn't take a cut of rent.",
              ]}
            />
            <Column
              icon={Building2}
              title="For your landlord clients"
              bullets={[
                "Each landlord owns their own account, properties, and data.",
                "Tenancy agreements drafted in-app (manual or AI on Pro+), signed by both parties.",
                "Real-time rent records; payouts to their own bank account, not yours.",
                "Per-property financial reports they can run themselves.",
              ]}
            />
            <Column
              icon={Users}
              title="For their tenants"
              bullets={[
                "Pay rent online via card, bank transfer, or USSD (Paystack).",
                "Auto-issued receipts on every payment.",
                "Lease and payment history in one app — no more lost agreements.",
                "Maintenance requests with photos, threaded with you or the landlord.",
              ]}
            />
          </section>

          {/* How it works */}
          <section className="mt-7 rounded-2xl border border-foundation-700/10 bg-surface p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              How it works
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Step
                n={1}
                title="Sign up as an agency"
                body="Create your manager account at property360.africa. Free 7-day trial."
              />
              <Step
                n={2}
                title="Onboard your landlords"
                body="Invite each landlord. They accept, choose what you can do per property, and you both see the work."
              />
              <Step
                n={3}
                title="Run the work"
                body="Add tenants, send agreements, collect rent, manage maintenance — all from one app. Each landlord gets their own dashboard."
              />
            </ol>
          </section>

          {/* What the work actually looks like */}
          <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card
              icon={ShieldCheck}
              title="Permissions you'd actually trust"
              body="Landlords toggle what you can do per property: can-add-tenant, can-record-payment, can-send-agreements, can-run-reports, can-renew-lease. Nothing happens behind their back."
            />
            <Card
              icon={Sparkles}
              title="AI tenancy agreements (Pro and above)"
              body="Draft a Nigerian-format tenancy agreement in seconds with Claude or Gemini, customize per landlord. Tenants sign in-app with a drawn or uploaded signature."
            />
          </section>

          {/* Pricing snapshot */}
          <section className="mt-7 rounded-2xl bg-foundation-700 p-5 text-paper">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
                Pricing snapshot
              </p>
              <p className="text-[11px] text-paper/70">
                Full table at property360.africa/pricing
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <PriceCell
                tier="Solo"
                price="₦2,250 / mo"
                note="Up to 2 buildings. For a single landlord."
              />
              <PriceCell
                tier="Pro"
                price="₦8,500 / mo"
                note="Up to 30 buildings + 5 manager seats. AI drafting included."
                highlight
              />
              <PriceCell
                tier="Agency"
                price="₦22,500 / mo"
                note="Up to 100 buildings + unlimited manager seats. For growing agencies."
              />
            </div>
            <p className="mt-4 text-[12px] leading-[1.55] text-paper/75">
              Each landlord you manage carries their own plan. Your agency's
              own plan covers properties you onboard under your own account.
              No per-tenant, per-receipt, or per-transaction fees from us —
              Paystack's standard processing fees apply on tenant payments.
            </p>
          </section>

          {/* CTA */}
          <section className="mt-7 flex flex-col items-start gap-3 border-t border-foundation-700/15 pt-5 print:flex-row print:items-center print:justify-between">
            <div>
              <p className="font-display text-[18px] font-extrabold leading-tight tracking-[-0.01em] text-foundation-700">
                Want a 15-minute walkthrough?
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                Email{" "}
                <a
                  href="mailto:hello@property360.africa"
                  className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                >
                  hello@property360.africa
                </a>{" "}
                or start a free trial at the link below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[12.5px] font-semibold text-paper hover:bg-foundation-800"
              >
                Start free trial <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="mailto:hello@property360.africa"
                className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
              >
                <Mail className="h-3.5 w-3.5" /> hello@property360.africa
              </a>
            </div>
          </section>

          {/* Print-only footer */}
          <footer className="mt-6 hidden border-t border-foundation-700/15 pt-3 text-[10px] text-ink-muted print:block">
            Property360 · property360.africa · Built in Nigeria · Page 1 of 1
          </footer>
        </article>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>

      {/* Print-tuned CSS — keep changes here so the on-screen view stays
          unchanged and we don't proliferate Tailwind print: utilities. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            background: #ffffff !important;
          }
          .bg-foundation-700 {
            background-color: #13272c !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .text-cryola-300,
          .text-cryola-400,
          .text-cryola-500 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          a {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Column({
  icon: Icon,
  title,
  bullets,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-foundation-700/10 bg-surface p-5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-cryola-300 text-foundation-700">
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </span>
      <h3 className="mt-3 text-[14.5px] font-semibold text-foundation-700">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-[12.5px] leading-[1.55] text-ink-muted">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-cryola-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 font-mono text-[12px] font-bold text-cryola-300">
        {n}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-foundation-700">{title}</p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-muted">
          {body}
        </p>
      </div>
    </li>
  );
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-foundation-700/10 bg-surface p-5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-cryola-300 text-foundation-700">
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-[14.5px] font-semibold text-foundation-700">
        {title}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-ink-muted">
        {body}
      </p>
    </div>
  );
}

function PriceCell({
  tier,
  price,
  note,
  highlight,
}: {
  tier: string;
  price: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-cryola-300 bg-foundation-600"
          : "border-foundation-600 bg-foundation-700"
      }`}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cryola-300">
        {tier}
        {highlight ? " · Recommended" : ""}
      </p>
      <p className="mt-2 font-display text-[20px] font-extrabold leading-none tracking-[-0.01em] text-paper">
        {price}
      </p>
      <p className="mt-2 text-[12px] leading-[1.4] text-paper/75">{note}</p>
    </div>
  );
}
