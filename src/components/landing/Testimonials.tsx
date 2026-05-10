"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

// Illustrative use cases — not real customer quotes. We use first-name +
// city + role to keep the spirit of the user without claiming attribution.
const voices = [
  {
    quote:
      "I used to spend the first week of every month chasing six tenants across three estates. Now I open the app, see who's paid, and the rest pay themselves before I even reach for the phone.",
    name: "Adaeze",
    role: "Landlord · Lekki",
  },
  {
    quote:
      "I&apos;ve had landlords who lose receipts. Property360 means I always have proof I paid. That alone is worth it.",
    name: "Ibrahim",
    role: "Tenant · Abuja",
  },
  {
    quote:
      "Managing properties for three landlords used to mean three WhatsApp threads, three different filing systems, three sets of complaints. Now it&apos;s one app and one inbox.",
    name: "Chinedu",
    role: "Agent · Port Harcourt",
  },
];

export function Testimonials() {
  return (
    <section className="bg-canvas py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
            Built for the way Nigeria rents
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl">
            Real workflows. Real time saved.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {voices.map((v, i) => (
            <motion.figure
              key={v.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="relative rounded-2xl border border-border bg-surface p-6 shadow-card"
            >
              <Quote className="h-6 w-6 text-cryola-500" />
              <blockquote className="mt-4 text-base leading-relaxed text-foundation-700">
                {v.quote.replace(/&apos;/g, "'")}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-foundation-700 text-cryola-300 text-sm font-bold">
                  {v.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foundation-700">{v.name}</p>
                  <p className="text-xs text-ink-muted">{v.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
