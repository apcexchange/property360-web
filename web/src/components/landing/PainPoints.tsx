"use client";

import { motion } from "framer-motion";
import { MessageSquareWarning, FileQuestion, ClockAlert } from "lucide-react";
import { Reveal } from "./Reveal";

const pains = [
  {
    icon: MessageSquareWarning,
    title: "The 1st of the month dread",
    body: "You're sending reminders. They're sending excuses. Three weeks later, you're still chasing one tenant for half the rent.",
  },
  {
    icon: FileQuestion,
    title: "Where is that tenancy agreement?",
    body: "Buried somewhere in your email. Or your lawyer's office. Or your old phone. Good luck finding it when you need it.",
  },
  {
    icon: ClockAlert,
    title: "Your agent says one thing, your tenant says another",
    body: "No paper trail. No shared truth. Every disagreement turns into he-said-she-said until someone pulls receipts.",
  },
];

export function PainPoints() {
  return (
    <section id="why" className="border-y border-border bg-foundation-700 py-24 text-cryola-50">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-cryola-300">
            Sound familiar?
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Renting in Nigeria shouldn&apos;t feel like a part-time job.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {pains.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                className="rounded-2xl border border-foundation-600 bg-foundation-800 p-6 transition hover:border-cryola-300/40"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-cryola-300/10 text-cryola-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-cryola-50">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foundation-50/70">{p.body}</p>
              </motion.div>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 flex items-center gap-3 rounded-full border border-cryola-300/30 bg-foundation-800 px-5 py-3 text-sm md:max-w-md">
            <span className="h-2 w-2 rounded-full bg-cryola-300" />
            <span className="text-cryola-50">
              <strong className="text-cryola-300">That all ends</strong> the day you install Property360.
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
