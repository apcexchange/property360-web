"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

// Illustrative use cases — not real customer quotes.
const voices = [
  {
    quote:
      "I used to spend the first week of every month chasing six tenants across three estates. Now I open the app, see who's paid, and the rest pay themselves before I even reach for the phone.",
    name: "Adaeze",
    role: "Landlord · Lekki",
  },
  {
    quote:
      "I've had landlords who lose receipts. Property360 means I always have proof I paid. That alone is worth it.",
    name: "Ibrahim",
    role: "Tenant · Abuja",
  },
  {
    quote:
      "Managing properties for three landlords used to mean three WhatsApp threads, three filing systems, three sets of complaints. Now it's one app, one inbox.",
    name: "Chinedu",
    role: "Agent · Port Harcourt",
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
            Real workflows. Real time saved.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {voices.map((v, i) => (
            <motion.figure
              key={v.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-foundation-700/10 bg-surface p-7 transition-colors hover:bg-cryola-50/60"
            >
              <Quote className="h-7 w-7 text-cryola-500 transition-transform duration-500 ease-out group-hover:rotate-[-6deg]" />
              <blockquote className="mt-5 text-[15.5px] leading-[1.6] text-foundation-700">
                {v.quote}
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-foundation-700/10 pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-foundation-700 text-cryola-300 text-[13px] font-bold">
                  {v.name[0]}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-foundation-700">{v.name}</p>
                  <p className="text-[12px] text-ink-muted">{v.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
