"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";
import { BrandLoader } from "@/components/ui/BrandLoader";

/**
 * Auth gate for /partner/*. Partners only, everyone else is bounced to
 * /partner/login. Mirrors components/me/AuthGate.tsx (the tenant gate),
 * gated on `role === "partner"` instead of `role === "tenant"`.
 */
export function PartnerAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    let cancelled = false;
    const token = session.getToken();
    const bounce = () => {
      router.replace("/partner/login");
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
        if (!user || user.role !== "partner") {
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
    return <BrandLoader label="Checking your session" />;
  }

  return <>{children}</>;
}
