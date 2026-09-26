"use client";

import { motion } from "framer-motion";
import {
  Receipt,
  Wallet,
  FileSignature,
  ShieldCheck,
  MessagesSquare,
  Wrench,
  ChartBar,
  Building,
  BellRing,
} from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: Receipt,
    title: "Auto-invoicing",
    body: "Set the rent schedule once. Invoices fire on time, every cycle, with reminders that stop when payment lands.",
  },
  {
    icon: Wallet,
    title: "Wallet & instant payouts",
    body: "Rent settles into your wallet the moment Paystack confirms it. Withdraw to any Nigerian bank in minutes.",
  },
  {
    icon: FileSignature,
    title: "Tenancy agreements, in-app",
    body: "Upload an agreement, OCR pulls the key fields, and both parties sign electronically in-app, typed name, optional signature image, defensible audit trail.",
  },
  {
    icon: ShieldCheck,
    title: "KYC for every account",
    body: "NIN, Driver's Licence, Passport, or Voter's Card. Verified before anyone collects rent or moves into your unit.",
  },
  {
    icon: MessagesSquare,
    title: "In-app chat",
    body: "Conversations live next to the property they're about, searchable, archived, shared with the right agents.",
  },
  {
    icon: Wrench,
    title: "Maintenance with photos",
    body: "Tenants snap a photo of the leak. Landlords see it in seconds. Track every request from open to resolved.",
  },
  {
    icon: ChartBar,
    title: "Reports landlords actually use",
    body: "P&L, balance sheet, cash flow. Pick a date range, export PDF or Excel, hand it to your accountant. Done.",
  },
  {
    icon: Building,
    title: "Multi-property, multi-agent",
    body: "Run a 50-unit estate or a single duplex. Invite agents with per-property permissions you can revoke anytime.",
  },
  {
    icon: BellRing,
    title: "Smart notifications",
    body: "Lease expiring in 30 days. Invoice overdue. New tenant accepted. The right person hears it the moment it happens.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-paper-deep/40 py-28 md:py-36"
    >
      {/* Subtle dotted backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(15 39 44 / 0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            Features
          </p>
          <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-foundation-700">
            The work behind a
            <br />
            <span className="text-ink-muted">well-run property.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-muted">From the first invoice to the final signature, Property360 gives landlords and agents one clear record of every important moment.</p>
        </Reveal>

        <div className="mt-16 grid border-t border-foundation-700/20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            // Wave stagger: each row reveals together, with each column slightly later
            const row = Math.floor(i / 3);
            const col = i % 3;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.65,
                  delay: row * 0.12 + col * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative min-h-64 border-b border-r border-foundation-700/15 px-0 py-7 pr-7 transition-colors hover:bg-surface/60 sm:px-7 lg:py-9"
              >
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between"><span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-ink-faint">{String(i + 1).padStart(2, "0")}</span><span className="grid h-9 w-9 place-items-center rounded-full border border-foundation-700/15 text-foundation-700 transition-colors group-hover:border-foundation-700 group-hover:bg-foundation-700 group-hover:text-cryola-300"><Icon className="h-4 w-4" /></span></div>
                  <h3 className="mt-auto pt-10 text-[18px] font-semibold leading-snug text-foundation-700">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-muted">
                    {f.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
