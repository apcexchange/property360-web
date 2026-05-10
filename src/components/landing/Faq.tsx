"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "./Reveal";

const faqs = [
  {
    q: "Is Property360 free to use?",
    a: "Downloading and using the core features is free. Tenants pay no platform fee on rent transactions. We may charge landlords a small fee on collected rent — always disclosed before you transact.",
  },
  {
    q: "Do I have to be tech-savvy to use it?",
    a: "If you can use WhatsApp, you can use Property360. The app guides you step-by-step from creating your first property to receiving your first rent payment.",
  },
  {
    q: "How do tenants pay?",
    a: "Through Paystack — by debit card, bank transfer, or USSD. Most payments confirm instantly. Funds settle into your in-app wallet, ready to be withdrawn to your bank account.",
  },
  {
    q: "What if my tenant doesn&apos;t want to use the app?",
    a: "Tenants only need to install the app to pay rent and receive their tenancy agreement. You can still track everything they pay manually if they prefer to pay outside the app.",
  },
  {
    q: "Can I add an agent who works for me?",
    a: "Yes. Invite an agent to a specific property and choose exactly what they can do — collect rent, sign agreements, manage maintenance, or just observe. Revoke access any time.",
  },
  {
    q: "Where does my data live? Is it secure?",
    a: "All data is encrypted in transit (TLS 1.2+) and stored on Mongo Atlas in the EU. We comply with the Nigeria Data Protection Act (NDPA). Read our full privacy policy for the details.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-surface py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl">
            Questions, answered.
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-canvas/50"
                  >
                    <span className="text-base font-semibold text-foundation-700">
                      {f.q.replace(/&apos;/g, "'")}
                    </span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
                        isOpen ? "bg-foundation-700 text-cryola-300" : "bg-cryola-100 text-foundation-700"
                      }`}
                    >
                      {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-6 text-ink-muted">
                          {f.a.replace(/&apos;/g, "'")}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
