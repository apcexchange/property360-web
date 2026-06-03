"use client";

import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const pains = [
  {
    n: "01",
    title: "The 1st of the month dread",
    body: "You're sending reminders. They're sending excuses. Three weeks later, you're still chasing one tenant for half the rent.",
  },
  {
    n: "02",
    title: "Where is that tenancy agreement?",
    body: "Buried somewhere in your email. Or your lawyer's office. Or your old phone. Good luck finding it when you need it.",
  },
  {
    n: "03",
    title: "30 tenants, one phone, the 1st of the month",
    body: "Reminders to chase. Receipts to write. Names to remember. Hostels and multi-unit buildings turn one landlord into a part-time clerk. Property360 hands the work back.",
  },
];

export function PainPoints() {
  return (
    <section
      id="why"
      className="relative overflow-hidden bg-foundation-700 py-24 text-paper md:py-32"
    >
      {/* Soft lime atmospheric wash bottom-left */}
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-cryola-400/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cryola-300">
            Sound familiar?
          </p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Renting in Nigeria shouldn&apos;t feel like
            <br />
            <span className="text-cryola-300">a part-time job.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-foundation-600/60 md:grid-cols-3">
          {pains.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-foundation-700 p-7 transition-colors hover:bg-foundation-800 md:p-8"
            >
              <p className="font-mono text-[13px] tracking-tight text-cryola-300/70">
                {p.n}
              </p>
              <h3 className="mt-5 text-[20px] font-semibold leading-snug text-paper">
                {p.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-paper/65">
                {p.body}
              </p>
              {/* Lime corner-tick that grows on hover */}
              <span
                aria-hidden
                className="absolute bottom-7 right-7 h-[2px] w-6 origin-right scale-x-50 bg-cryola-400 transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 inline-flex items-center gap-3 rounded-full border border-cryola-300/30 bg-foundation-800/70 px-5 py-2.5 text-[14px]">
            <span className="live-dot h-2 w-2 rounded-full bg-cryola-300" />
            <span className="text-paper">
              <strong className="text-cryola-300">That all ends</strong> the day you install Property360.
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
