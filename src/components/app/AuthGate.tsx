"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";
import { BrandLoader } from "@/components/ui/BrandLoader";

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
      // Keep the query string so deep links survive sign-in (for example the
      // sales assistant's one-tap /app/billing?plan=pro&interval=annual link).
      const next = encodeURIComponent((pathname || "/app") + window.location.search);
      router.replace(`/login?next=${next}`);
    };
    const redirectForRole = (role?: string) => {
      if (role === "tenant") {
        router.replace("/me");
        return;
      }
      if (role === "partner") {
        router.replace("/partner");
        return;
      }
      if (role === "admin") {
        router.replace("/admin");
        return;
      }
      bounce();
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
          // This is a valid signed-in user at the wrong portal, not a failed
          // authentication. Preserve their token and take them to the area
          // that matches their account instead of creating a login loop.
          redirectForRole(user?.role);
          return;
        }
        session.set(token, user);
        // Email verification is enforced only during self-service web
        // onboarding (see /onboarding/account → /onboarding/verify), not as a
        // runtime gate here. Hard-blocking on emailVerified locked out every
        // pre-existing / mobile-registered landlord (the flag defaults false
        // and was only ever set by the OTP flow). See backfillEmailVerified.
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
    return <BrandLoader label="Checking your session" />;
  }

  return <>{children}</>;
}
