"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "#why", label: "Why Property360" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-canvas/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-foundation-700 text-cryola-300 shadow-card">
            P
          </span>
          <span className="text-lg text-foundation-700">Property360</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-foundation-700">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#download"
          className="rounded-full bg-foundation-700 px-4 py-2 text-sm font-medium text-cryola-50 shadow-card transition hover:bg-foundation-800 hover:shadow-pop"
        >
          Get the app
        </a>
      </div>
    </header>
  );
}
