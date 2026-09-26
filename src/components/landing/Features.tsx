"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  Hotel,
  Landmark,
  MapPinned,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "./Reveal";

const platformAreas = [
  {
    icon: MapPinned,
    number: "01",
    kicker: "Marketplace",
    title: "List. Discover. Move.",
    body: "Homes, land, shops, commercial spaces and shortlets—available to browse, list and manage in one place. Standard listings are free for owners and independent agents.",
  },
  {
    icon: Hotel,
    number: "02",
    kicker: "Stays",
    title: "Hotels belong here too.",
    body: "Give your hotel a storefront, publish rooms, manage availability and let guests make a booking from the same property platform.",
  },
  {
    icon: BadgeCheck,
    number: "03",
    kicker: "Trust",
    title: "Start with more confidence.",
    body: "Reviewed listings, account verification and clear records help the right people find each other before money or keys change hands.",
  },
  {
    icon: Landmark,
    number: "04",
    kicker: "Money",
    title: "Collect, confirm, withdraw.",
    body: "Automated invoices, Paystack payments, receipts and Nigerian-bank payouts keep the rent cycle visible from due date to settlement.",
  },
  {
    icon: FileSignature,
    number: "05",
    kicker: "Tenancy",
    title: "Keep the whole tenancy together.",
    body: "Agreements, signatures, reminders, maintenance and supporting documents sit beside the property—not across disconnected chats and folders.",
  },
  {
    icon: MessagesSquare,
    number: "06",
    kicker: "Operations",
    title: "Run the business behind the building.",
    body: "Work across properties and teams with permissions, conversations, notifications and reports that make the next decision easier.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative isolate overflow-hidden bg-foundation-800 py-24 text-paper md:py-32">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-cryola-300/[0.08] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-cryola-500/[0.08] blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cryola-300">One connected platform</p>
            <p className="mt-5 max-w-sm text-[15px] leading-[1.65] text-paper/65">
              Property360 is built for the entire lifecycle of a property—not
              only the day rent is due.
            </p>
          </div>
          <div>
            <h2 className="max-w-4xl font-display text-[clamp(3rem,7vw,5.7rem)] font-extrabold leading-[0.91] tracking-[-0.055em] text-paper">
              More than rent.
              <br />
              <span className="text-cryola-300">The whole property business.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 border-t border-paper/20">
          {platformAreas.map((area, index) => {
            const Icon = area.icon;
            return (
              <motion.article
                key={area.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.58, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group grid gap-5 border-b border-paper/15 py-7 transition-colors duration-300 hover:border-cryola-300/70 md:grid-cols-[80px_minmax(0,1fr)_minmax(250px,0.8fr)_48px] md:items-center md:gap-8 md:py-9"
              >
                <div className="flex items-center justify-between md:block">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.15em] text-cryola-300/70">{area.number}</span>
                  <span className="ml-4 inline-grid h-10 w-10 place-items-center rounded-full border border-paper/20 text-cryola-300 md:ml-0 md:mt-4">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300">{area.kicker}</p>
                  <h3 className="mt-2 font-display text-[clamp(1.8rem,3.2vw,2.75rem)] font-extrabold leading-[1] tracking-[-0.035em] text-paper">{area.title}</h3>
                </div>
                <p className="max-w-md text-[14.5px] leading-[1.65] text-paper/65">{area.body}</p>
                <ArrowRight className="hidden h-5 w-5 text-cryola-300 transition-transform duration-300 group-hover:translate-x-1 md:block" />
              </motion.article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-5 border-t border-paper/15 pt-7 sm:flex-row sm:items-center">
          <p className="max-w-xl text-[15px] leading-relaxed text-paper/65">
            Built for landlords, agents, tenants, independent listers and hotel teams across Nigeria.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/listings" className="group inline-flex items-center gap-2 rounded-full bg-cryola-300 px-5 py-3 text-[13px] font-semibold text-foundation-800 transition hover:bg-cryola-200">
              Explore the marketplace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center rounded-full border border-paper/25 px-5 py-3 text-[13px] font-semibold text-paper transition hover:border-cryola-300 hover:text-cryola-300">
              See plans and tools
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
