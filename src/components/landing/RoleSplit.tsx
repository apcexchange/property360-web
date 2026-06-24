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
    <section className="relative bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            Built for everyone in the rental
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foundation-700">
            One app for <span className="text-cryola-500">every role</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-[1.55] text-ink-muted">
            Whether you collect rent, manage it, or pay it, Property360 fits the
            way you work, landlords, property managers, and tenants alike.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col rounded-3xl border border-foundation-700/10 bg-surface p-8 transition-shadow hover:shadow-[0_30px_60px_-30px_rgb(15_39_44_/_0.22)]"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foundation-700 text-cryola-300">
                  <Icon className="h-7 w-7" />
                </div>

                <h3 className="mt-6 text-[22px] font-bold leading-snug tracking-[-0.01em] text-foundation-700">
                  {role.label}
                </h3>
                <p className="mt-2 text-[16px] font-semibold leading-snug text-foundation-700">
                  {role.promise}
                </p>
                <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
                  {role.body}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {role.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cryola-300">
                        <Check className="h-3 w-3 text-foundation-700" strokeWidth={3} />
                      </span>
                      <span className="text-[14px] leading-snug text-foundation-700">
                        {b}
                      </span>
                    </li>
                  ))}

                  {role.comingSoon.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foundation-700/10">
                        <Clock className="h-3 w-3 text-foundation-700/70" strokeWidth={2.5} />
                      </span>
                      <span className="text-[14px] leading-snug text-ink-muted">
                        {b}
                        <span className="ml-2 inline-flex items-center rounded-full bg-foundation-700/8 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.08em] text-foundation-700/60">
                          Soon
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={role.cta.href}
                  className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-foundation-800"
                >
                  {role.cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
