"use client";

import { motion } from "framer-motion";
import {
  Building2,
  KeyRound,
  Briefcase,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "./Reveal";

const roles = [
  {
    icon: Building2,
    label: "For Landlords",
    title: "Run your portfolio like a property company.",
    body: "From a single duplex to a 50-unit estate, every property, lease, payment, and expense is in one place. Auto-bill rent, get paid into your wallet, and pay yourself out to your bank account in minutes.",
    bullets: [
      "Auto-issued invoices on the schedule you pick",
      "Paystack-powered rent collection (card, bank, USSD)",
      "Real-time wallet · withdraw to GTBank, Access, Zenith, more",
      "P&L, balance sheet, cash flow exports",
    ],
    accent: "bg-cryola-300 text-foundation-700",
  },
  {
    icon: KeyRound,
    label: "For Tenants",
    title: "Your home, your lease, your receipts — all in your pocket.",
    body: "Pay rent without leaving the app. Get instant receipts. Raise maintenance requests with photos. See exactly when your lease expires so renewal never sneaks up on you.",
    bullets: [
      "Pay by card, transfer, or USSD — instant confirmation",
      "Tap to download every receipt and tenancy agreement",
      "Maintenance requests with photo evidence",
      "Chat directly with your landlord or agent",
    ],
    accent: "bg-foundation-700 text-cryola-300",
  },
  {
    icon: Briefcase,
    label: "For Agents",
    title: "Manage other people&apos;s properties — with their permission.",
    body: "Get invited by landlords with permissions you actually need: collect rent, screen tenants, sign agreements, or just observe. Every action is logged so trust is never in question.",
    bullets: [
      "Per-property permission flags from the landlord",
      "Audit trail of every action you take on their behalf",
      "Manage multiple landlords from one dashboard",
      "Get notified the moment a unit becomes vacant",
    ],
    accent: "bg-cryola-300 text-foundation-700",
  },
];

export function RoleSplit() {
  return (
    <section className="bg-canvas py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
            Built for everyone in the rental
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl md:text-5xl">
            One app. Three sides of the deal.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-muted">
            Whether you collect rent, pay it, or manage on someone&apos;s behalf —
            Property360 has a role-aware experience that fits how you work.
          </p>
        </Reveal>

        <div className="mt-16 space-y-12 md:space-y-20">
          {roles.map((role, i) => {
            const Icon = role.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 ${
                  reverse ? "md:[&>div:first-child]:order-last" : ""
                }`}
              >
                {/* Visual */}
                <div className="relative">
                  <div className="aspect-square w-full max-w-md rounded-3xl bg-foundation-700 p-10 text-cryola-50 shadow-pop">
                    <div className={`grid h-14 w-14 place-items-center rounded-2xl ${role.accent}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-cryola-300">
                      {role.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold leading-snug">
                      {role.title.replace("&apos;", "'")}
                    </p>
                  </div>
                  {/* Decorative accent square */}
                  <div className="absolute -bottom-4 -right-4 -z-10 h-24 w-24 rounded-2xl bg-cryola-300/60" />
                </div>

                {/* Bullets */}
                <div>
                  <p className="text-base text-ink-muted leading-relaxed">{role.body}</p>
                  <ul className="mt-6 space-y-3">
                    {role.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cryola-300">
                          <Check className="h-3 w-3 text-foundation-700" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-foundation-700">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#download"
                    className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-foundation-700 transition hover:text-foundation-900"
                  >
                    Try it as a {role.label.replace("For ", "").toLowerCase()}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
