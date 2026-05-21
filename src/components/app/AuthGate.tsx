"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";

/**
 * Landlord-only auth gate for the /app/* section. Shares the same JWT
 * storage as /billing and /admin (session module) — the only thing
 * different is the role check and the login URL we bounce to.
 *
 * On unauthenticated or non-landlord users we route to /billing/login
 * (rather than a separate /app/login) because billing login already
 * enforces landlord role and the post-login destination supports a
 * `next=` redirect.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    let cancelled = false;
    const token = session.getToken();
    const bounce = () => {
      const next = encodeURIComponent(pathname || "/app");
      router.replace(`/billing/login?next=${next}`);
    };
    if (!token) {
      bounce();
      return;
    }
    api
      .get("/auth/profile")
      .then((res) => {
        if (cancelled) return;
        const user = (res.data?.data ?? res.data) as AdminUser;
        if (!user || user.role !== "landlord") {
          session.clear();
          bounce();
          return;
        }
        session.set(token, user);
        setState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        session.clear();
        bounce();
        setState("fail");
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (state !== "ok") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-foundation-500">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
