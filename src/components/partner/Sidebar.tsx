"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const PARTNER_NAV_ITEMS: NavItem[] = [
  { href: "/partner", label: "Earnings & payout" },
  { href: "/partner/kyc", label: "Identity verification" },
  { href: "/partner/bank", label: "Bank accounts" },
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/partner") return pathname === "/partner";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function PartnerSidebar() {
  const pathname = usePathname();
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
            Partner portal
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-6 py-7 text-[14.5px]">
        <ul>
          {PARTNER_NAV_ITEMS.map((item) => {
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
                  className={`flex items-center py-1.5 leading-snug transition-colors ${
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
      </nav>
    </aside>
  );
}
