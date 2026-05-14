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
    body: "Set the rent schedule once. Property360 issues invoices on time, every cycle, with reminders that stop when payment lands.",
  },
  {
    icon: Wallet,
    title: "Wallet & instant payouts",
    body: "Rent settles into your wallet the moment Paystack confirms it. Withdraw to any Nigerian bank in minutes.",
  },
  {
    icon: FileSignature,
    title: "Tenancy agreements, signed in-app",
    body: "Upload an agreement, OCR pulls out the key fields, and both parties sign with DocuSeal — fully legal, fully digital.",
  },
  {
    icon: ShieldCheck,
    title: "KYC for every account",
    body: "NIN, Driver's Licence, Passport, or Voter's Card. Verified before you let someone collect your rent or move into your unit.",
  },
  {
    icon: MessagesSquare,
    title: "In-app chat",
    body: "No more lost WhatsApp threads. Conversations live next to the property they're about — searchable, archived, shared with agents.",
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
    body: "Lease expiring in 30 days. Invoice overdue. New tenant accepted. The right person hears about it the moment it happens.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-canvas py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
            Features
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl md:text-5xl">
            Everything a Nigerian rental needs.
            <br />
            <span className="text-ink-muted">Nothing it doesn&apos;t.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-foundation-700 text-cryola-300 transition group-hover:bg-cryola-300 group-hover:text-foundation-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foundation-700">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
