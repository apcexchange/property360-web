"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, User } from "lucide-react";
import { session } from "@/lib/session";

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Top bar shown on every /app/* page. Title + optional action buttons on
 * the left, current user + sign-out menu on the right.
 */
export function AppTopbar({ title, subtitle, actions }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const user = session.getUser();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function signOut() {
    session.clear();
    router.replace("/billing/login");
  }

  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") || "L";

  return (
    <header className="sticky top-0 z-30 border-b border-foundation-700/10 bg-paper/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] font-extrabold tracking-[-0.01em] text-foundation-700">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div ref={wrapRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-foundation-700/10 bg-surface px-2.5 py-1.5 text-[13px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-foundation-700 text-[11px] font-semibold uppercase text-paper">
                {initials.toUpperCase()}
              </span>
              <span className="hidden max-w-[160px] truncate sm:inline">
                {user?.firstName ?? user?.email ?? "Account"}
              </span>
              <ChevronDown className="h-4 w-4 text-ink-muted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-foundation-700/10 bg-paper shadow-lg">
                <div className="border-b border-foundation-700/10 p-3">
                  <p className="text-[13px] font-semibold text-foundation-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/billing"
                  className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Subscription &amp; billing
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 border-t border-foundation-700/10 px-3 py-2.5 text-left text-[13px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
