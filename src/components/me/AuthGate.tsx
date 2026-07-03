"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";
import { BrandLoader } from "@/components/ui/BrandLoader";

/**
 * Auth gate for /me/*. Tenants only, landlords / agents are bounced to
 * /login which routes them onwards.
 */
export function TenantAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    let cancelled = false;
    const token = session.getToken();
    const bounce = () => {
      const next = encodeURIComponent(pathname || "/me");
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
        if (!user || user.role !== "tenant") {
          session.clear();
          bounce();
          return;
        }
        session.set(token, user);
        // Email verification is enforced only during self-service web
        // onboarding, not as a runtime gate here. Tenants are often created
        // by their landlord (no OTP step), so blocking on emailVerified would
        // lock them out of their own area permanently. See backfillEmailVerified.
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
