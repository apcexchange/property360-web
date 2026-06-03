"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { session } from "@/lib/session";

const links = [
  { href: "/listings", label: "Browse" },
  { href: "/landlord", label: "Landlords" },
  { href: "/tenant", label: "Tenants" },
  { href: "/agents", label: "Agents" },
  { href: "/pricing", label: "Pricing" },
];

// Map role → in-app landing route. Tenants live under /me/*, landlords
// and agents under /app/*. Anything else (admin, custom) defaults to
// /app/dashboard which the AppAuthGate will handle.
function inAppHomeFor(role?: string): string {
  if (role === "tenant") return "/me";
  return "/app/dashboard";
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // Hydration: session is localStorage-backed. Until mounted, render
  // the logged-out variant so anonymous users on first paint never see
  // a misleading "Open dashboard" link.
  const [mounted, setMounted] = useState(false);
  const [signedInHref, setSignedInHref] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const user = session.getUser();
    if (user) setSignedInHref(inAppHomeFor(user.role));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="sticky top-3 z-30 mx-auto w-full max-w-6xl px-4"
    >
      <div
        className={`flex items-center justify-between gap-4 rounded-full px-3 py-2 transition-all duration-300 ${
          scrolled
            ? "border border-foundation-700/10 bg-paper/80 shadow-[0_18px_36px_-22px_rgb(15_39_44_/_0.18)] backdrop-blur-xl"
            : "border border-transparent bg-transparent"
        }`}
      >
        <Link
          href="/"
          className="group flex items-center gap-2 pl-2 pr-3 font-semibold tracking-tight"
        >
          <motion.span
            initial={false}
            animate={{ scale: scrolled ? 0.92 : 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="grid h-9 w-9 place-items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Property360"
              className="h-9 w-9 object-contain"
            />
          </motion.span>
          <span className="text-[15px] text-foundation-700">
            Property<span className="text-cryola-500">360</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-[13.5px] text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && signedInHref ? (
            <Link
              href={signedInHref}
              className="group inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              Open dashboard
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding"
                className="group inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
              >
                Get started
                <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
