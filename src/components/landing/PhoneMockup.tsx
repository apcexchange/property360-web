"use client";

import { motion } from "framer-motion";
import { CheckCircle2, BellRing, Wallet } from "lucide-react";

/**
 * CSS-built phone frame showing a mock app screen, with floating UI cards
 * that drift in and bob gently. No image assets, everything is divs + SVG.
 */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto h-[560px] w-[300px]">
      {/* Soft glowing blob behind the phone */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-cryola-300/30 blur-3xl" />

      {/* Phone frame */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative h-full w-full rounded-[44px] border-[10px] border-foundation-900 bg-foundation-900 shadow-2xl"
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foundation-900" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-canvas">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-foundation-700">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span>5G</span>
              <span>•••</span>
            </span>
          </div>

          {/* Greeting */}
          <div className="px-5 pt-6">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              Good morning
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-foundation-700">
              Adaeze 👋
            </h3>
          </div>

          {/* Wallet card */}
          <div className="mx-5 mt-4 rounded-2xl bg-foundation-700 p-4 text-cryola-50 shadow-pop">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cryola-300/80">
              Wallet balance
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">₦1,284,500</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-lg bg-cryola-300 px-3 py-1.5 text-xs font-semibold text-foundation-700">
                Withdraw
              </button>
              <button className="flex-1 rounded-lg border border-cryola-300/30 px-3 py-1.5 text-xs font-semibold text-cryola-50">
                History
              </button>
            </div>
          </div>

          {/* Properties list */}
          <div className="px-5 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foundation-700">Properties</p>
              <span className="text-[10px] font-medium text-ink-muted">3 active</span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { name: "Lekki Phase 1 Duplex", state: "100% occupied" },
                { name: "Yaba Studio Block", state: "9 of 12 leased" },
                { name: "GRA Port Harcourt", state: "75% occupied" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-cryola-100">
                    <span className="h-2 w-2 rounded-full bg-cryola-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-foundation-700">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-ink-muted">{p.state}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating cards */}
      <FloatingCard
        className="-left-16 top-20"
        delay={0.4}
        icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        title="Rent received"
        body="₦850,000 · Ibrahim M."
      />
      <FloatingCard
        className="-right-14 top-44"
        delay={0.7}
        icon={<BellRing className="h-4 w-4 text-amber-600" />}
        title="Lease renewal"
        body="Yaba unit 4 · 30 days left"
      />
      <FloatingCard
        className="-right-10 bottom-24"
        delay={1.0}
        icon={<Wallet className="h-4 w-4 text-foundation-700" />}
        title="Payout sent"
        body="₦2.1M → GTBank •••2418"
      />
    </div>
  );
}

interface FloatingCardProps {
  className?: string;
  delay: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}

function FloatingCard({ className, delay, icon, title, body }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`absolute z-20 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5 shadow-pop"
      >
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-canvas">{icon}</div>
        <div>
          <p className="text-[11px] font-semibold text-foundation-700">{title}</p>
          <p className="text-[10px] text-ink-muted">{body}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
