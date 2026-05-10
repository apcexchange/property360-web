"use client";

import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const steps = [
  {
    number: "01",
    title: "Sign up in 60 seconds",
    body: "Email, phone, password — that's it. Verify your identity with NIN, Driver's Licence, Passport, or Voter's Card and you're ready to transact.",
  },
  {
    number: "02",
    title: "Add your properties or join one",
    body: "Landlords list properties and units. Tenants accept invitation links from their landlord. Agents get invited by the landlords they work for.",
  },
  {
    number: "03",
    title: "Set the lease, set the rent schedule",
    body: "Pick monthly, quarterly, or annual billing. Set fees the Nigerian way: caution, agent, agreement, legal, service. Property360 generates and sends invoices automatically.",
  },
  {
    number: "04",
    title: "Get paid, on time, into your wallet",
    body: "Tenants pay through Paystack — card, bank transfer, USSD. Funds settle into your wallet, and you withdraw to your bank account whenever you want.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl md:text-5xl">
            From download to first rent collection in under a day.
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* Vertical line behind steps */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-cryola-300 via-foundation-200 to-transparent md:block"
          />

          <div className="space-y-10 md:space-y-16">
            {steps.map((s, i) => {
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={s.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr]"
                >
                  {/* Left card or spacer */}
                  {left ? (
                    <StepCard step={s} align="right" />
                  ) : (
                    <div className="hidden md:block" />
                  )}

                  {/* Step bullet */}
                  <div className="hidden h-12 w-12 items-center justify-center rounded-full border-4 border-canvas bg-foundation-700 text-sm font-bold text-cryola-300 shadow-pop md:flex">
                    {s.number.replace(/^0/, "")}
                  </div>

                  {/* Right card or spacer */}
                  {!left ? (
                    <StepCard step={s} align="left" />
                  ) : (
                    <div className="hidden md:block" />
                  )}

                  {/* Mobile-only: render the card inline */}
                  <div className="md:hidden">
                    <StepCard step={s} align="left" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  align,
}: {
  step: { number: string; title: string; body: string };
  align: "left" | "right";
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-canvas p-6 shadow-card transition hover:shadow-pop ${
        align === "right" ? "md:text-right" : "md:text-left"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-widest text-cryola-500 ${
          align === "right" ? "md:text-right" : ""
        }`}
      >
        Step {step.number}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-foundation-700">{step.title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{step.body}</p>
    </div>
  );
}
