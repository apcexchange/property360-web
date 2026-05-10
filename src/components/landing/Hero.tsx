"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-24 left-1/3 -z-10 h-96 w-96 rounded-full bg-cryola-200/40 blur-3xl" />
      <div className="absolute -top-16 right-0 -z-10 h-80 w-80 rounded-full bg-foundation-200/40 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-cryola-100/40 via-canvas to-canvas" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-24 md:pt-24 md:pb-32 lg:grid-cols-2 lg:gap-8">
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-cryola-300 bg-cryola-100 px-3 py-1 text-xs font-semibold text-foundation-700">
            <Sparkles className="h-3.5 w-3.5" />
            Built in Lagos · For landlords across Nigeria
          </span>

          <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.05] tracking-tight text-foundation-700 sm:text-5xl md:text-[3.75rem]">
            Stop chasing rent.
            <br />
            <span className="relative inline-block">
              Start collecting it.
              <span className="absolute -bottom-1 left-0 h-2 w-full -skew-x-6 rounded-full bg-cryola-300/70" />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Property360 is the all-in-one app that helps Nigerian landlords,
            agents, and tenants run their properties — from leasing and rent
            collection to maintenance and payouts. No spreadsheets. No endless
            WhatsApp threads. Just rent that arrives on time, every time.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#download"
              className="group inline-flex items-center gap-2 rounded-full bg-foundation-700 px-7 py-3.5 text-sm font-semibold text-cryola-50 shadow-pop transition hover:bg-foundation-800"
            >
              Download the app
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="text-sm font-semibold text-foundation-700 transition hover:text-foundation-900"
            >
              See how it works →
            </a>
          </div>

          {/* Inline trust strip */}
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["#13272C", "#19343B", "#1F414A", "#1C3B43"].map((c) => (
                <div
                  key={c}
                  className="h-8 w-8 rounded-full border-2 border-canvas"
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-foundation-700">Trusted by landlords</span>{" "}
              from Lagos to Port Harcourt.
            </p>
          </div>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative hidden h-[600px] items-center justify-center lg:flex"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
