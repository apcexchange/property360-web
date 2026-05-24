"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Magnetic } from "./Magnetic";

export function FinalCta() {
  const ref = useRef<HTMLDivElement | null>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <section
      id="download"
      ref={ref}
      onMouseMove={handleMove}
      className="cursor-spotlight relative overflow-hidden bg-foundation-700 py-32 text-paper"
    >
      {/* Static atmospheric layers */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-cryola-300/15 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#BFFF84_1px,transparent_1px),linear-gradient(to_bottom,#BFFF84_1px,transparent_1px)] [background-size:96px_96px]"
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.035em]"
        >
          Your next rent payment
          <br />
          should be the
          <span className="ml-3 inline-block">
            <span className="draw-underline">easy one.</span>
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="mx-auto mt-7 max-w-xl text-[17px] leading-[1.55] text-paper/75"
        >
          Use Property360 today on the web and run your first cycle by next
          month. Free for your first property. No card. No commitment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Magnetic>
            <Link
              href="/onboarding"
              className="group inline-flex items-center gap-2 rounded-full bg-cryola-300 px-8 py-4 text-[15px] font-semibold text-foundation-800 transition hover:bg-cryola-200"
            >
              Create your free account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 rounded-full border border-cryola-300/20 px-6 py-3.5 text-[14px] font-semibold text-paper transition hover:border-cryola-300/60 hover:bg-foundation-800"
          >
            I already have an account
            <span className="inline-block transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cryola-300"
        >
          Mobile apps coming soon to App Store &amp; Play Store
        </motion.p>
      </div>
    </section>
  );
}
