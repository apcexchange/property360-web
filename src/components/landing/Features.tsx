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
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foundation-700">
            Everything a Nigerian rental needs.
            <br />
            <span className="text-ink-muted">Nothing it doesn&apos;t.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                className="tilt-card group relative overflow-hidden rounded-2xl border border-foundation-700/10 bg-surface p-7 transition-shadow hover:shadow-[0_30px_60px_-30px_rgb(15_39_44_/_0.25)]"
              >
                {/* Lime corner sweep on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cryola-300/0 blur-2xl transition-colors duration-500 group-hover:bg-cryola-300/60"
                />
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-foundation-700 text-cryola-300 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-[-3deg]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[18px] font-semibold leading-snug text-foundation-700">
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
