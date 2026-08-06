"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { tenantApi } from "@/lib/tenant-api";
import { NavBadge } from "@/components/app/NavBadge";
import { useSidebar } from "@/components/app/SidebarContext";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const ME_NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/me", label: "My home" },
      { href: "/me/notifications", label: "Notifications" },
    ],
  },
  {
    label: "Lease",
    items: [
      { href: "/me/lease", label: "Lease summary" },
      { href: "/me/agreement", label: "Tenancy agreement" },
      { href: "/me/notices", label: "Notices" },
    ],
  },
  {
    label: "Payments",
    items: [
      { href: "/me/payments", label: "Payments" },
      { href: "/me/invitations", label: "Invitations" },
    ],
  },
  {
    label: "Building",
    items: [
      { href: "/me/bills", label: "Shared bills" },
      { href: "/me/maintenance", label: "Maintenance" },
      { href: "/me/chat", label: "Chat" },
      { href: "/me/assistant", label: "AI Assistant" },
    ],
  },
  {
    label: "Marketplace",
    items: [{ href: "/listings", label: "Browse listings" }],
  },
  {
    label: "Account",
    items: [{ href: "/me/profile", label: "Profile" }],
  },
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/me") return pathname === "/me";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

interface SidebarNavProps {
  pathname: string;
  chatUnread: number;
  onItemClick?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

function SidebarNav({
  pathname,
  chatUnread,
  onItemClick,
  showClose,
  onClose,
}: SidebarNavProps) {
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
                Tenant home
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
        {ME_NAV_SECTIONS.map((section) => (
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
                      className={`flex items-center py-1.5 leading-snug transition-colors ${
                        active
                          ? "font-medium text-paper"
                          : "text-foundation-200 hover:text-paper"
                      }`}
                    >
                      {item.label}
                      {item.href === "/me/chat" && (
                        <NavBadge count={chatUnread} />
                      )}
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

export function TenantSidebar() {
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const chatUnread = useQuery({
    queryKey: ["me", "chat", "unread-count"],
    queryFn: () => tenantApi.unreadChatCount(),
    refetchInterval: 20_000,
  });

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

  const unreadCount = chatUnread.data ?? 0;

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-foundation-700 text-paper lg:flex">
        <SidebarNav pathname={pathname} chatUnread={unreadCount} />
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
            pathname={pathname}
            chatUnread={unreadCount}
            onItemClick={close}
            showClose
            onClose={close}
          />
        </aside>
      </div>
    </>
  );
}
