"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { session, AdminUser } from "@/lib/session";
import { NAV_SECTIONS, SidebarContent } from "./Sidebar";

interface Props {
  /** Override the title that's auto-derived from the URL. Optional. */
  title?: string;
  /** Optional second breadcrumb segment (e.g. an entity name on a detail page). */
  trail?: string;
}

function deriveTitle(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === "/admin" && pathname === "/admin") return item.label;
      if (item.href !== "/admin" && pathname.startsWith(item.href)) return item.label;
    }
  }
  return "Admin";
}

// localStorage doesn't fire change events for us, so the subscribe is a no-op.
// On hydration getSnapshot returns null (matches the server render), then the
// real value is committed on the next paint without flashing.
const subscribeNoop = () => () => {};
const getServerSnapshot = (): AdminUser | null => null;

function useAdminUser(): AdminUser | null {
  return useSyncExternalStore(subscribeNoop, () => session.getUser(), getServerSnapshot);
}

function initials(user: AdminUser): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || user.email[0]?.toUpperCase() || "?";
}

export function Topbar({ title, trail }: Props = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAdminUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = () => {
    session.clear();
    router.replace("/admin/login");
  };

  const resolvedTitle = title ?? deriveTitle(pathname);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-foundation-700/15 bg-paper/85 backdrop-blur-md">
        {/* Brand bar — thin foundation rule with lime tip */}
        <div className="h-[3px] w-full bg-foundation-700">
          <div className="h-full w-[180px] bg-cryola-400" />
        </div>
        <div className="flex h-[57px] items-center justify-between gap-4 px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-sm border border-rule px-2 py-1.5 text-ink-body hover:bg-cryola-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <nav aria-label="breadcrumb" className="flex min-w-0 items-baseline gap-2.5 text-sm">
              <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700 sm:inline">
                Admin
              </span>
              <span className="hidden text-foundation-300/60 sm:inline">/</span>
              <span className="truncate font-display text-[17px] font-medium tracking-[-0.015em] text-foundation-700">
                {resolvedTitle}
              </span>
              {trail && (
                <>
                  <span className="text-foundation-300/60">·</span>
                  <span className="truncate font-display text-[15px] italic text-ink-muted">
                    {trail}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Live data chip — brand-forward, communicates production state */}
            <span className="hidden items-center gap-1.5 rounded-full border border-foundation-700/20 bg-foundation-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper sm:inline-flex">
              <span aria-hidden className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-cryola-400" />
              Live · production
            </span>
            {user && (
              <div className="hidden items-center gap-3 sm:flex">
                <div className="text-right leading-tight">
                  <p className="text-[12.5px] font-medium text-foundation-700">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-ink-faint">{user.email}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foundation-700 font-display text-[13px] font-medium text-cryola-300">
                  {initials(user)}
                </span>
              </div>
            )}
            <button
              onClick={signOut}
              className="rounded-sm border border-foundation-700/30 bg-surface px-3 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.1em] text-foundation-700 transition hover:bg-cryola-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-foundation-900/55 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-[260px] flex-col bg-foundation-700 text-paper shadow-pop">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
