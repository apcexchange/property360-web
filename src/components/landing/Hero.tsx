"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MapPin, Search, Play, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { Transition } from "framer-motion";

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

// TODO(property360): replace with the real product walkthrough video.
// "Watch Demo" opens this in a new tab (YouTube/Vimeo).
const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=REPLACE_WITH_DEMO_VIDEO";

export function Hero() {
  const reduce = useReducedMotion();

  // One simple fade-up, staggered by delay. Calm, not busy.
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <section className="relative isolate overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Soft brand wash, two faint drifting blobs, very light grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="drift-slow absolute -top-32 left-[12%] h-[34rem] w-[34rem] rounded-full bg-cryola-300/25 blur-3xl" />
        <div
          className="drift-slow absolute top-28 right-[10%] h-[26rem] w-[26rem] rounded-full bg-cryola-200/25 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
        <div className="absolute inset-0 opacity-[0.02] [background-image:linear-gradient(to_right,#0B171A_1px,transparent_1px),linear-gradient(to_bottom,#0B171A_1px,transparent_1px)] [background-size:88px_88px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          {...fade(0)}
          className="inline-flex items-center gap-2 rounded-full border border-foundation-700/15 bg-paper/70 px-3 py-1 text-[11px] font-medium tracking-tight text-foundation-700 backdrop-blur-md"
        >
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-cryola-500" />
          Built in Nigeria · for landlords, tenants &amp; agents
        </motion.div>

        <motion.h1
          {...fade(0.08)}
          className="mt-7 text-[clamp(2.6rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-foundation-700"
        >
          Everything your rental needs.
          <br />
          <span className="text-cryola-500">In one app.</span>
        </motion.h1>

        <motion.p
          {...fade(0.18)}
          className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.55] text-ink-muted md:text-[18px]"
        >
          Collect rent online, automate invoices and receipts, manage leases and
          maintenance, and fill vacant units. One platform for landlords,
          tenants, and agents across Nigeria.
        </motion.p>

        {/* Tenant front-door: location search routes to the listings marketplace */}
        <motion.form
          {...fade(0.26)}
          action="/listings"
          method="get"
          className="mx-auto mt-9 flex max-w-2xl items-center gap-2 rounded-full border border-foundation-700/12 bg-paper/90 p-2 pl-5 shadow-[0_18px_44px_-26px_rgb(15_39_44_/_0.35)] backdrop-blur"
        >
          <MapPin aria-hidden className="h-5 w-5 shrink-0 text-ink-muted" />
          <label htmlFor="hero-search" className="sr-only">
            Search homes for rent by location
          </label>
          <input
            id="hero-search"
            name="search"
            type="text"
            placeholder="Find your next home: try an area like Lekki, Ikeja or Wuse"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-foundation-700 placeholder:text-ink-muted/70 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </motion.form>

        <motion.div
          {...fade(0.34)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/onboarding"
            className="group inline-flex items-center gap-2 rounded-full bg-foundation-700 px-7 py-3.5 text-sm font-semibold text-paper shadow-[0_18px_40px_-22px_rgb(15_39_44_/_0.5)] transition-colors hover:bg-foundation-800"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-foundation-700/15 bg-paper/80 px-6 py-3.5 text-sm font-semibold text-foundation-700 backdrop-blur transition hover:border-foundation-700/30 hover:bg-paper"
          >
            <Play className="h-4 w-4" />
            Watch demo
          </a>
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 rounded-full border border-foundation-700/15 bg-paper/80 px-6 py-3.5 text-sm font-semibold text-foundation-700 backdrop-blur transition hover:border-foundation-700/30 hover:bg-paper"
          >
            <CalendarDays className="h-4 w-4" />
            Request demo
          </Link>
        </motion.div>

        <motion.p {...fade(0.42)} className="mt-6 text-sm text-ink-muted">
          Free for your first property. No card required.
        </motion.p>
      </div>
    </section>
  );
}
