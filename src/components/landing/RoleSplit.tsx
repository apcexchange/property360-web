"use client";

import { motion } from "framer-motion";
import { Building2, KeyRound, Briefcase, Check, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "./Reveal";

type Role = {
  icon: typeof Building2;
  label: string;
  promise: string;
  body: string;
  bullets: string[];
  comingSoon: string[];
  cta: { label: string; href: string };
};

const roles: Role[] = [
  {
    icon: Building2,
    label: "Landlords",
    promise: "Run your portfolio, not a part-time job.",
    body: "From a single duplex to a 50-unit estate, every property, lease, and payment lives in one place.",
    bullets: [
      "Paystack rent collection (card, bank, USSD)",
      "Auto invoices, instant receipts, and late fees",
      "Wallet with payouts to any Nigerian bank",
      "Tenancy agreements: upload, OCR, in-app e-signing",
      "Maintenance tracking and real-time tenant chat",
      "Agents with per-property permissions and audit trail",
      "Reports: P&L, balance sheet, cash-flow exports",
    ],
    comingSoon: ["Advanced analytics and charts", "Yoruba, Igbo & Hausa language"],
    cta: { label: "Get started", href: "/onboarding" },
  },
  {
    icon: Briefcase,
    label: "Property Managers / Agents",
    promise: "One dashboard for every landlord you serve.",
    body: "Managing across multiple landlords is messy. Property360 centralises it, with only the access each landlord grants you.",
    bullets: [
      "Central dashboard for all your landlords",
      "Per-property permissions set by the landlord",
      "Audit trail of every action on their behalf",
      "Record payments, add tenants, manage maintenance",
      "Sign and upload tenancy agreements (when permitted)",
      "Alerts the moment a unit goes vacant",
    ],
    comingSoon: ["Advanced analytics and charts", "Yoruba, Igbo & Hausa language"],
    cta: { label: "Get started", href: "/onboarding" },
  },
  {
    icon: KeyRound,
    label: "Tenants",
    promise: "Your home, lease, and receipts in your pocket.",
    body: "Browse verified listings, reserve in two taps, and run your whole tenancy from one place.",
    bullets: [
      "Browse verified listings and reserve in two taps",
      "Pay rent by card, transfer, or USSD",
      "Instant receipts and downloadable agreements",
      "Sign your tenancy agreement in-app",
      "Maintenance requests with photo evidence",
      "Chat with your landlord; lease-expiry reminders",
    ],
    comingSoon: [
      "Rent savings: set money aside toward rent",
      "Rent loans to cover rent when cash is tight",
      "Yoruba, Igbo & Hausa language",
    ],
    cta: { label: "Find a home", href: "/listings" },
  },
];

export function RoleSplit() {
  return (
    <section className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div>
            <p className="eyebrow text-foundation-700">Built around real rental work</p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-foundation-700">
              A better rental experience, from every side.
            </h2>
          </div>
          <p className="max-w-xl text-[17px] leading-[1.6] text-ink-muted lg:pb-1">
            The work is different for an owner, an agent and a tenant. The
            experience should still feel clear, accountable and easy to trust.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 border-y border-foundation-700/15 md:grid-cols-3">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <motion.article
                key={role.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group flex min-w-0 flex-col border-b border-foundation-700/15 py-9 last:border-b-0 md:border-b-0 md:px-8 md:first:pl-0 md:not-last:border-r md:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-cryola-500">
                    0{i + 1}
                  </span>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-foundation-700/15 text-foundation-700 transition-colors duration-300 group-hover:border-cryola-400 group-hover:text-cryola-600">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                </div>

                <h3 className="mt-9 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {role.label}
                </h3>
                <p className="mt-3 font-display text-[clamp(1.7rem,2.6vw,2.15rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foundation-700">
                  {role.promise}
                </p>
                <p className="mt-5 text-[14.5px] leading-[1.65] text-ink-muted">
                  {role.body}
                </p>

                <ul className="mt-7 flex-1 border-t border-foundation-700/10 pt-5">
                  {role.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 py-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cryola-600" strokeWidth={2.6} />
                      <span className="text-[13.5px] leading-snug text-foundation-700">
                        {b}
                      </span>
                    </li>
                  ))}

                  {role.comingSoon.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 py-1.5">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                      <span className="text-[13.5px] leading-snug text-ink-muted">
                        {b}
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Planned</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={role.cta.href}
                  className="mt-8 inline-flex w-fit items-center gap-2 border-b border-foundation-700 pb-1 text-[14px] font-semibold text-foundation-700 transition-colors hover:border-cryola-500 hover:text-cryola-600"
                >
                  {role.cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
