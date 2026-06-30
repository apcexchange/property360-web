"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

// Third-person scenarios, not testimonials. We'll switch to real
// customer quotes (with permission + name) once we have them.
const scenarios = [
  {
    label: "A hostel owner",
    sub: "30 students, four floors",
    body: "spent the first week of every month walking floor to floor with a receipt book. Property360 sends each student an invoice on the 1st, accepts their payment online, and updates a single dashboard. The receipt book retired.",
  },
  {
    label: "A landlord with three flats",
    sub: "Lagos · long-let",
    body: "stopped chasing rent over WhatsApp. Tenants now pay through the app and the lease, signed in-app, sits one tap away in their pocket whenever there's a question about terms.",
  },
  {
    label: "A property manager",
    sub: "Acting for three landlords",
    body: "used to juggle three WhatsApp threads, three filing systems, three sets of complaints. Property360 turns it into one inbox, each landlord sees only their own properties, with permission to delegate the work.",
  },
];

export function Testimonials() {
  return (
    <section className="relative bg-paper py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            Built for the way Nigeria rents
          </p>
          <h2 className="mt-4 max-w-2xl text-[clamp(1.85rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foundation-700">
            Three workflows we built around.
          </h2>
          <p className="mt-4 max-w-xl text-[14.5px] leading-[1.6] text-ink-muted">
            Scenarios drawn from the conversations we had while building the
            product. Real quotes from real customers will replace these once
            we have permission to share them.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {scenarios.map((v, i) => (
            <motion.figure
              key={v.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-foundation-700/10 bg-surface p-7 transition-colors hover:bg-cryola-50/60"
            >
              <Quote className="h-7 w-7 text-cryola-500 transition-transform duration-500 ease-out group-hover:rotate-[-6deg]" />
              <p className="mt-5 text-[15.5px] leading-[1.6] text-foundation-700">
                <span className="font-semibold text-foundation-700">
                  {v.label}
                </span>{" "}
                {v.body}
              </p>
              <figcaption className="mt-7 border-t border-foundation-700/10 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Scenario · {v.sub}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
