"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { session } from "@/lib/session";

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
        { href: "/app/wallet", label: "Wallet" },
        { href: "/app/transactions", label: "Transactions" },
        { href: "/app/reports", label: "Reports" },
      ],
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

export function AppSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRole(session.getUser()?.role);
  }, []);

  const sections = buildSections(role);
  const deskLabel = role === "agent" ? "Manager desk" : "Landlord desk";

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-foundation-700 text-paper lg:flex">
      <div className="border-b border-foundation-600/70 px-6 pb-5 pt-7">
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
    </aside>
  );
}
