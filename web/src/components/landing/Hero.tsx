"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { PhoneMockup } from "./PhoneMockup";
import { Magnetic } from "./Magnetic";

const HEADLINE_LINE_1 = "Stop chasing rent.";
const HEADLINE_LINE_2 = ["Start", "collecting", "it."];

export function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  // Subtle scroll-driven parallax on the visual side. Springless so the
  // motion is tied directly to the scrollbar — feels physical, not floaty.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const meshY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32"
    >
      {/* Gradient-mesh atmosphere — three slowly-drifting blobs of brand color */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: meshY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="drift-slow absolute -top-32 left-[15%] h-[34rem] w-[34rem] rounded-full bg-cryola-300/45 blur-3xl" />
        <div className="drift-fast absolute -top-10 right-[5%] h-[28rem] w-[28rem] rounded-full bg-foundation-300/25 blur-3xl" />
        <div className="drift-slow absolute top-40 left-[40%] h-[22rem] w-[22rem] rounded-full bg-cryola-200/50 blur-3xl" style={{ animationDelay: "-7s" }} />
        {/* Hairline grid for editorial structure */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#0B171A_1px,transparent_1px),linear-gradient(to_bottom,#0B171A_1px,transparent_1px)] [background-size:88px_88px]" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* Copy column */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-foundation-700/15 bg-paper/70 px-3 py-1 text-[11px] font-medium tracking-tight text-foundation-700 backdrop-blur-md"
          >
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-cryola-500" />
            Built in Lagos · for landlords across Nigeria
          </motion.div>

          <h1 className="mt-7 text-[clamp(2.5rem,7vw,4.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foundation-700">
            <WordRevealLine words={[HEADLINE_LINE_1]} baseDelay={0.05} reduced={reduce} />
            <br />
            <WordRevealLine
              words={HEADLINE_LINE_2}
              baseDelay={0.55}
              reduced={reduce}
              underlineLast
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05, ease: "easeOut" }}
            className="mt-7 max-w-xl text-[17.5px] leading-[1.55] text-ink-muted"
          >
            Property360 is the all-in-one app for Nigerian landlords, agents,
            and tenants — from leasing and rent collection to maintenance and
            payouts. No spreadsheets. No endless WhatsApp threads. Just rent
            that arrives on time, every time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-5"
          >
            <Magnetic>
              <a
                href="#download"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foundation-700 px-7 py-3.5 text-sm font-semibold text-paper shadow-[0_18px_40px_-22px_rgb(15_39_44_/_0.5)] transition-colors hover:bg-foundation-800"
              >
                {/* Lime sweep on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 -translate-x-full bg-cryola-400/25 transition-transform duration-500 ease-out group-hover:translate-x-0"
                  style={{ width: "120%" }}
                />
                <span className="relative">Download the app</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Magnetic>

            <a
              href="#how"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foundation-700 transition hover:text-foundation-900"
            >
              See how it works
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.45 }}
            className="mt-12 flex items-center gap-4"
          >
            <div className="flex -space-x-2">
              {["#13272C", "#19343B", "#1F414A", "#1C3B43"].map((c) => (
                <div
                  key={c}
                  className="h-8 w-8 rounded-full border-2 border-paper"
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-foundation-700">Trusted by landlords</span>{" "}
              from Lagos to Port Harcourt.
            </p>
          </motion.div>
        </div>

        {/* Visual column */}
        <motion.div
          style={reduce ? undefined : { y: phoneY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
          className="relative hidden h-[600px] items-center justify-center lg:flex"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Renders a line of words with a staggered upward reveal — the words rise
 * out of an invisible mask in sequence. The last word in the line can opt
 * into the lime "draw underline" highlight.
 */
function WordRevealLine({
  words,
  baseDelay,
  reduced,
  underlineLast = false,
}: {
  words: string[];
  baseDelay: number;
  reduced: boolean | null;
  underlineLast?: boolean;
}) {
  return (
    <span className="inline">
      {words.map((word, i) => {
        const isLast = underlineLast && i === words.length - 1;
        return (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={reduced ? { y: 0 } : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{
                duration: 0.7,
                delay: reduced ? 0 : baseDelay + i * 0.085,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {isLast ? <span className="draw-underline">{word}</span> : word}
              {i < words.length - 1 && " "}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
