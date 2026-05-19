"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
          Install Property360 today and run your first cycle by next month.
          Free to download. No credit card. No commitment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Magnetic>
            <StoreBadge label="Download on the" store="App Store" href="#" />
          </Magnetic>
          <Magnetic>
            <StoreBadge label="Get it on" store="Google Play" href="#" />
          </Magnetic>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cryola-300"
        >
          Coming soon to App Store &amp; Play Store
        </motion.p>
      </div>
    </section>
  );
}

function StoreBadge({
  label,
  store,
  href,
}: {
  label: string;
  store: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-cryola-300/20 bg-foundation-800/80 px-6 py-3.5 backdrop-blur-sm transition hover:border-cryola-300/60 hover:bg-foundation-800"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-cryola-300 text-foundation-700 transition-transform duration-500 group-hover:rotate-[10deg]">
        <ArrowRight className="h-5 w-5 -rotate-45 transition-transform duration-500 group-hover:rotate-0" />
      </div>
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cryola-300/80">
          {label}
        </p>
        <p className="text-[15.5px] font-semibold tracking-tight text-paper">
          {store}
        </p>
      </div>
    </a>
  );
}
