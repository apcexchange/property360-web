"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, BedDouble, Bath, Search, Sparkles, ArrowUpRight } from "lucide-react";

const listings = [
  {
    title: "Modern 2-bedroom · Lekki Phase 1",
    price: "₦4.5M",
    cadence: "/year",
    bedrooms: 2,
    bathrooms: 2,
    badge: "Just listed",
    badgeTone: "bg-cryola-300 text-foundation-700",
  },
  {
    title: "Serviced studio · Yaba",
    price: "₦1.2M",
    cadence: "/year",
    bedrooms: 1,
    bathrooms: 1,
    badge: "Reserved",
    badgeTone: "bg-amber-200 text-amber-900",
  },
  {
    title: "4-bedroom duplex · GRA Port Harcourt",
    price: "₦6.8M",
    cadence: "/year",
    bedrooms: 4,
    bathrooms: 3,
    badge: "Negotiable",
    badgeTone: "bg-foundation-700 text-cryola-300",
  },
];

export function Marketplace() {
  return (
    <section id="marketplace" className="relative overflow-hidden border-y border-foundation-700/10 bg-foundation-700 py-20 text-paper md:py-24">
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-cryola-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -top-36 h-96 w-96 rounded-full bg-cryola-500/20 blur-3xl" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cryola-300">
            Property360 marketplace
          </p>
          <h2 className="mt-4 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-paper">
            Find a place.
            <br />
            <span className="text-cryola-300">List your property free.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[16.5px] leading-[1.55] text-paper/75">
            Browse homes, shortlets, shops, commercial spaces and land across Nigeria. Any owner or independent agent can publish a standard listing free, subject to review.
          </p>

          <ul className="mt-8 space-y-4">
            <Bullet
              icon={<Search className="h-3.5 w-3.5 text-foundation-700" strokeWidth={2.5} />}
              title="Homes, land and commercial spaces"
              body="Search properties for rent or sale, including shortlets, shops and plots."
            />
            <Bullet
              icon={<MapPin className="h-3.5 w-3.5 text-foundation-700" strokeWidth={2.5} />}
              title="Free to publish"
              body="Post directly as an owner or authorised independent agent. Standard photo listings are free."
            />
            <Bullet
              icon={<Sparkles className="h-3.5 w-3.5 text-foundation-700" strokeWidth={2.5} />}
              title="Reviewed listings"
              body="Listings are reviewed before they appear and can be reported if something looks wrong."
            />
          </ul>

          <Link
            href="/listings"
            className="group mt-10 inline-flex items-center gap-1.5 rounded-full bg-cryola-300 px-5 py-3 text-sm font-bold text-foundation-700 transition hover:bg-cryola-200"
          >
            Browse the marketplace
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Visual: stacked listing cards with sequential side-in reveal */}
        <div className="relative">
          <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-foundation-200/30 blur-3xl" />
          <div className="space-y-4">
            {listings.map((l, i) => (
              <motion.div
                key={l.title}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-2xl border border-paper/15 bg-paper p-5 transition-shadow hover:shadow-[0_28px_56px_-30px_rgb(0_0_0_/_0.3)]"
              >
                {/* Lime corner glow on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cryola-300/0 blur-2xl transition-colors duration-500 group-hover:bg-cryola-300/60"
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15.5px] font-semibold text-foundation-700">
                      {l.title}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" /> {l.bedrooms} bd
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" /> {l.bathrooms} ba
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${l.badgeTone}`}
                  >
                    {l.badge}
                  </span>
                </div>
                <div className="relative mt-4 flex items-end justify-between border-t border-foundation-700/10 pt-4">
                  <p className="text-[26px] font-extrabold tracking-[-0.025em] text-foundation-700 tabular">
                    {l.price}
                    <span className="ml-1 text-[14px] font-medium text-ink-muted">{l.cadence}</span>
                  </p>
                  <span className="rounded-full bg-foundation-700 px-3.5 py-1.5 text-[11.5px] font-semibold text-paper transition group-hover:bg-foundation-800">
                    Reserve →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cryola-300">
        {icon}
      </span>
      <span className="text-[14.5px]">
        <span className="font-semibold text-paper">{title}.</span>{" "}
        <span className="text-paper/70">{body}</span>
      </span>
    </li>
  );
}
