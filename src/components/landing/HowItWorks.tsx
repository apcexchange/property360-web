"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Sign up in 60 seconds",
    body: "Email, phone, password, that's it. Verify with NIN, Driver's Licence, Passport, or Voter's Card and you're ready to transact.",
  },
  {
    n: "02",
    title: "Add your properties or join one",
    body: "Landlords list properties and units. Tenants accept invitation links. Agents get invited by the landlords they work for.",
  },
  {
    n: "03",
    title: "Set the lease, set the rent schedule",
    body: "Pick monthly, quarterly, or annual billing. Caution, agent, agreement, legal, service, all the Nigerian fee categories handled.",
  },
  {
    n: "04",
    title: "Get paid, on time, into your wallet",
    body: "Tenants pay via Paystack, card, bank, USSD. Funds settle into your wallet, withdraw to any Nigerian bank in minutes.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement | null>(null);
  // Scroll-driven progress for the vertical timeline rail
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 50%"],
  });
  const railHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how" className="relative bg-paper py-28 md:py-36">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            How it works
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foundation-700">
            From download to first rent collection in
            <span className="text-cryola-500"> under a day.</span>
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-20 pl-10 sm:pl-16">
          {/* Faint base rail */}
          <div
            aria-hidden
            className="absolute left-3 top-0 h-full w-px bg-foundation-700/15 sm:left-6"
          />
          {/* Animated foreground rail, fills as user scrolls */}
          <motion.div
            aria-hidden
            style={{ height: railHeight }}
            className="absolute left-3 top-0 w-px origin-top bg-foundation-700 sm:left-6"
          />

          <div className="space-y-14 sm:space-y-20">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Bullet on the rail */}
                <span
                  aria-hidden
                  className="absolute -left-[34px] top-1.5 grid h-6 w-6 place-items-center rounded-full bg-paper sm:-left-[58px]"
                >
                  <span className="grid h-3 w-3 place-items-center rounded-full bg-foundation-700 ring-4 ring-cryola-300/40" />
                </span>

                <div className="grid grid-cols-1 items-baseline gap-3 sm:grid-cols-[80px_1fr] sm:gap-8">
                  <p className="font-mono text-[13px] tracking-tight text-cryola-500">
                    Step {s.n}
                  </p>
                  <div>
                    <h3 className="text-[22px] font-semibold leading-snug text-foundation-700 sm:text-[26px]">
                      {s.title}
                    </h3>
                    <p className="mt-2.5 max-w-2xl text-[15.5px] leading-[1.6] text-ink-muted">
                      {s.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
