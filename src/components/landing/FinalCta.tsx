"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section id="download" className="relative overflow-hidden bg-foundation-700 py-28 text-cryola-50">
      {/* Glow */}
      <div className="absolute -top-40 left-1/2 -z-0 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-cryola-300/20 blur-3xl" />
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,_var(--color-cryola-300)/0.06,_transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        >
          Your next rent payment
          <br />
          should be the easy one.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-xl text-lg text-foundation-50/80"
        >
          Install Property360 today and run your first cycle by next month.
          Free to download. No credit card. No commitment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <StoreBadge
            label="Download on the"
            store="App Store"
            href="#"
          />
          <StoreBadge
            label="Get it on"
            store="Google Play"
            href="#"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-xs uppercase tracking-widest text-cryola-300"
        >
          Coming soon to App Store & Play Store
        </motion.p>
      </div>
    </section>
  );
}

function StoreBadge({ label, store, href }: { label: string; store: string; href: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-cryola-300/20 bg-foundation-800 px-6 py-3.5 transition hover:border-cryola-300 hover:bg-foundation-600"
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-cryola-300 text-foundation-700">
        <ArrowRight className="h-5 w-5 -rotate-45 transition group-hover:rotate-0" />
      </div>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-widest text-cryola-300/80">{label}</p>
        <p className="text-base font-semibold text-cryola-50">{store}</p>
      </div>
    </a>
  );
}
