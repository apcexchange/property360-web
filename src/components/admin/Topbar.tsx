"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { session, AdminUser } from "@/lib/session";

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(session.getUser());
  }, []);

  const signOut = () => {
    session.clear();
    router.replace("/admin/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <h1 className="text-base font-semibold text-foundation-700">{title}</h1>
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden text-xs text-ink-muted sm:inline">
            Signed in as{" "}
            <span className="font-medium text-foundation-700">{user.email}</span>
          </span>
        )}
        <button
          onClick={signOut}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foundation-700 transition hover:bg-canvas"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
