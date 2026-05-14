"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import adminApi from "@/lib/admin";
import { session } from "@/lib/session";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    let cancelled = false;
    const token = session.getToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    adminApi
      .me()
      .then((u) => {
        if (cancelled) return;
        if (u.role !== "admin") {
          session.clear();
          router.replace("/admin/login");
        } else {
          // Refresh stored profile in case role/email changed.
          session.set(token, u);
          setState("ok");
        }
      })
      .catch(() => {
        if (cancelled) return;
        session.clear();
        router.replace("/admin/login");
        setState("fail");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-foundation-500">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
