"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
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
    a: "Through Paystack — by debit card, bank transfer, or USSD. Most payments confirm instantly. Funds settle into your in-app wallet, ready to withdraw to your bank account.",
  },
  {
    q: "What if my tenant doesn't want to use the app?",
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
    <section id="faq" className="relative bg-paper-deep/40 py-28 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            FAQ
          </p>
          <h2 className="mt-4 text-[clamp(1.85rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foundation-700">
            Questions, answered.
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-foundation-700/10 border-y border-foundation-700/10">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left transition"
                  >
                    <span className="text-[16.5px] font-semibold text-foundation-700 transition-colors group-hover:text-foundation-900">
                      {f.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                        isOpen
                          ? "bg-foundation-700 text-cryola-300"
                          : "bg-cryola-100 text-foundation-700 group-hover:bg-cryola-200"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-12 text-[14.5px] leading-[1.65] text-ink-muted">
                          {f.a}
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
