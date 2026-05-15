"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/properties", label: "Properties" },
      { href: "/admin/leases", label: "Leases" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/listings", label: "Listings" },
      { href: "/admin/reservations", label: "Reservations" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/transactions", label: "Transactions" },
      { href: "/admin/payouts", label: "Payouts" },
      { href: "/admin/reports/financial", label: "Financial reports" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/admin/kyc", label: "KYC reviews" },
      { href: "/admin/reports", label: "Moderation" },
      { href: "/admin/deletion-requests", label: "Deletion requests" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/audit-log", label: "Audit log" }],
  },
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  // Financial reports is a sub-route of /admin/reports — treat them as distinct.
  if (itemHref === "/admin/reports") return pathname === "/admin/reports";
  return pathname.startsWith(itemHref);
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  return (
    <>
      {/* Masthead — newspaper plate */}
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
            Admin desk
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-6 py-7 text-[14.5px]">
        {NAV_SECTIONS.map((section) => (
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
                      onClick={onNavigate}
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

      <div className="border-t border-foundation-600/70 px-6 py-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-450">
          Lagos · WAT
        </p>
        <p className="mt-1.5 font-display text-[13.5px] italic leading-snug text-foundation-200">
          Built for the Nigerian rental market.
        </p>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-foundation-700 text-paper lg:flex">
      <SidebarContent />
    </aside>
  );
}
