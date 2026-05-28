"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { session } from "@/lib/session";
import { useSidebar } from "./SidebarContext";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function buildSections(role: string | undefined): NavSection[] {
  const isAgent = role === "agent";
  const portfolioItems: NavItem[] = [
    { href: "/app/properties", label: "Properties" },
    { href: "/app/tenants", label: "Tenants" },
    isAgent
      ? { href: "/app/landlords", label: "Landlords" }
      : { href: "/app/agents", label: "Property managers" },
    { href: "/app/community", label: "Community" },
  ];

  return [
    {
      label: "Overview",
      items: [
        { href: "/app/dashboard", label: "Dashboard" },
        { href: "/app/notifications", label: "Notifications" },
      ],
    },
    {
      label: "Portfolio",
      items: portfolioItems,
    },
    {
      label: "Finance",
      items: [
        { href: "/app/invoices", label: "Invoices" },
        { href: "/app/receipts", label: "Receipts" },
        { href: "/app/wallet", label: "Wallet" },
        { href: "/app/transactions", label: "Transactions" },
        { href: "/app/reports", label: "Reports" },
      ],
    },
    {
      label: "Operations",
      items: [{ href: "/app/maintenance", label: "Maintenance" }],
    },
    {
      label: "Marketplace",
      items: [{ href: "/app/marketplace", label: "Listings" }],
    },
    {
      label: "Communication",
      items: [{ href: "/app/chat", label: "Messages" }],
    },
    {
      label: "Account",
      items: [
        { href: "/app/refer", label: "Refer a landlord" },
        { href: "/app/profile", label: "Profile" },
        { href: "/billing", label: "Subscription" },
      ],
    },
  ];
}

// Default sections (landlord view) — used during SSR before localStorage is
// available so the markup is stable.
export const APP_NAV_SECTIONS: NavSection[] = buildSections(undefined);

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/app/dashboard") return pathname === "/app" || pathname === "/app/dashboard";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

interface NavBodyProps {
  sections: NavSection[];
  deskLabel: string;
  pathname: string;
  onItemClick?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

function SidebarNav({
  sections,
  deskLabel,
  pathname,
  onItemClick,
  showClose,
  onClose,
}: NavBodyProps) {
  return (
    <>
      <div className="border-b border-foundation-600/70 px-6 pb-5 pt-7">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="font-display text-[28px] font-medium leading-none tracking-[-0.035em] text-paper">
                Property
              </span>
              <span className="font-display text-[28px] font-medium leading-none tracking-[-0.035em] text-cryola-300">
                360
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="h-px w-7 bg-cryola-400" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300/90">
                {deskLabel}
              </span>
            </div>
          </div>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-paper/80 transition hover:bg-foundation-600/40 hover:text-paper"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-6 py-7 text-[14.5px]">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-450">
              {section.label}
            </p>
            <ul>
              {section.items.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className="absolute -left-6 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-cryola-400"
                      />
                    )}
                    <Link
                      href={item.href}
                      onClick={onItemClick}
                      className={`block py-1.5 leading-snug transition-colors ${
                        active
                          ? "font-medium text-paper"
                          : "text-foundation-200 hover:text-paper"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRole(session.getUser()?.role);
  }, []);

  // Close drawer on route change so picking a link feels native.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sections = buildSections(role);
  const deskLabel = role === "agent" ? "Manager desk" : "Landlord desk";

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-foundation-700 text-paper lg:flex">
        <SidebarNav sections={sections} deskLabel={deskLabel} pathname={pathname} />
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-foundation-700 text-paper shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarNav
            sections={sections}
            deskLabel={deskLabel}
            pathname={pathname}
            onItemClick={close}
            showClose
            onClose={close}
          />
        </aside>
      </div>
    </>
  );
}
