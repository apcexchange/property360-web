"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";

/**
 * Auth gate for /app/*. Allows landlords and property managers (role:
 * agent); tenants and unauthenticated users are bounced to /login,
 * which then routes them appropriately.
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
      router.replace(`/login?next=${next}`);
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
        if (!user || (user.role !== "landlord" && user.role !== "agent")) {
          session.clear();
          bounce();
          return;
        }
        session.set(token, user);
        // Email verification is a hard gate. A user who skipped the verify
        // step (closed the tab, etc.) and deep-links into /app/* gets
        // bounced back to the OTP screen.
        if (user.emailVerified === false) {
          router.replace("/onboarding/verify");
          return;
        }
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
