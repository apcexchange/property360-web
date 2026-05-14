"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/kyc", label: "KYC reviews" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/deletion-requests", label: "Deletion requests" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-foundation-700 text-cryola-50 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-foundation-600 px-6 font-semibold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cryola-300 text-foundation-700">
          P
        </span>
        <span>Property360</span>
        <span className="ml-1 rounded-md bg-foundation-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cryola-300">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 text-sm">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 transition ${
                active
                  ? "bg-cryola-300 text-foundation-700"
                  : "text-foundation-50 hover:bg-foundation-600"
              }`}
            >
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-foundation-600 px-6 py-4 text-xs text-foundation-450">
        Property360 · Admin
      </div>
    </aside>
  );
}
