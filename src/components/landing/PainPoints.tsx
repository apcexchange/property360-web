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
    <section id="why" className="bg-foundation-700 py-24 text-paper md:py-32">

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

        <div className="mt-16 grid border-y border-paper/20 md:grid-cols-3">
          {pains.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative min-h-64 border-b border-paper/15 py-8 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
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
              <span aria-hidden className="absolute bottom-0 left-0 h-px w-0 bg-cryola-300 transition-all duration-500 group-hover:w-12" />
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 inline-flex items-center gap-3 border-l border-cryola-300 pl-4 text-[14px]">
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
