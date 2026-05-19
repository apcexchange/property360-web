"use client";

import { motion } from "framer-motion";
import { Building2, KeyRound, Briefcase, Check, ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

const roles = [
  {
    icon: Building2,
    label: "For Landlords",
    title: "Run your portfolio like a property company.",
    body: "From a single duplex to a 50-unit estate — every property, lease, payment, and expense in one place. Auto-bill rent, collect into your wallet, and pay yourself out to your bank in minutes.",
    bullets: [
      "Auto-issued invoices on the schedule you pick",
      "Paystack-powered rent collection (card, bank, USSD)",
      "Real-time wallet · withdraw to GTBank, Access, Zenith, more",
      "P&L, balance sheet, cash flow exports",
    ],
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
  },
  {
    icon: Briefcase,
    label: "For Agents",
    title: "Manage other people's properties — with their permission.",
    body: "Get invited by landlords with the permissions you actually need: collect rent, screen tenants, sign agreements, or just observe. Every action is logged, so trust is never in question.",
    bullets: [
      "Per-property permission flags from the landlord",
      "Audit trail of every action you take on their behalf",
      "Manage multiple landlords from one dashboard",
      "Get notified the moment a unit becomes vacant",
    ],
  },
];

export function RoleSplit() {
  return (
    <section className="relative bg-paper py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            Built for everyone in the rental
          </p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foundation-700">
            One app.
            <span className="text-cryola-500"> Three sides</span> of the deal.
          </h2>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-[1.55] text-ink-muted">
            Whether you collect rent, pay it, or manage on someone&apos;s behalf —
            Property360 has a role-aware experience that fits how you work.
          </p>
        </Reveal>

        <div className="mt-20 space-y-20 md:space-y-28">
          {roles.map((role, i) => {
            const Icon = role.icon;
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className={`grid grid-cols-1 items-center gap-12 md:grid-cols-2 ${
                  reverse ? "md:[&>div:first-child]:order-last" : ""
                }`}
              >
                {/* Visual block */}
                <div className="relative">
                  <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-foundation-700 p-10 text-paper">
                    {/* Subtle grid backdrop */}
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#BFFF84_1px,transparent_1px),linear-gradient(to_bottom,#BFFF84_1px,transparent_1px)] [background-size:48px_48px]"
                    />
                    <div className="relative">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cryola-300 text-foundation-700">
                        <Icon className="h-7 w-7" />
                      </div>
                      <p className="mt-10 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cryola-300">
                        {role.label}
                      </p>
                      <p className="mt-4 text-[26px] font-extrabold leading-[1.15] tracking-[-0.025em] text-paper">
                        {role.title}
                      </p>
                    </div>
                    {/* Lime corner accent */}
                    <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-cryola-400/30 blur-2xl" />
                  </div>
                  {/* Decorative offset block */}
                  <div className="absolute -bottom-3 -right-3 -z-10 h-24 w-24 rounded-2xl bg-cryola-300/70" />
                </div>

                {/* Bullets */}
                <div>
                  <p className="text-[16px] leading-[1.6] text-ink-muted">{role.body}</p>
                  <ul className="mt-7 space-y-3.5">
                    {role.bullets.map((b, j) => (
                      <motion.li
                        key={b}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: 0.15 + j * 0.06 }}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cryola-300">
                          <Check className="h-3 w-3 text-foundation-700" strokeWidth={3} />
                        </span>
                        <span className="text-[14.5px] text-foundation-700">{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <a
                    href="#download"
                    className="group mt-9 inline-flex items-center gap-1.5 text-sm font-semibold text-foundation-700 transition hover:text-foundation-900"
                  >
                    Try it as a {role.label.replace("For ", "").toLowerCase()}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
