"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, capturePageview, identifyUser } from "@/lib/analytics";
import { session } from "@/lib/session";

/**
 * Initializes PostHog once on mount and re-identifies an already-logged-in user
 * (covers a page load while a session exists). Fires a manual $pageview on every
 * App Router path change, since client navigations don't trigger the SDK's
 * automatic pageview. UTM/referrer are read from the URL by posthog itself.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
    const user = session.getUser();
    if (user) identifyUser(user._id, { role: user.role });
  }, []);

  useEffect(() => {
    capturePageview();
  }, [pathname]);

  return <>{children}</>;
}
