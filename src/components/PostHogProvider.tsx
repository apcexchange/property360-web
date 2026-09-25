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
 *
 * On the /email/* pages (one-click unsubscribe/opt-in links) we skip identify
 * and the manual $pageview. The SDK is still initialised, so events such as
 * $pageleave can still fire there; before_send scrubs the token out of every
 * event property, $set and $set_once before anything is sent.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmailPage = pathname?.startsWith("/email/") ?? false;

  useEffect(() => {
    initAnalytics();
    if (isEmailPage) return;
    const user = session.getUser();
    if (user) identifyUser(user._id, { role: user.role });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once by design
  }, []);

  useEffect(() => {
    if (isEmailPage) return;
    capturePageview();
  }, [pathname, isEmailPage]);

  return <>{children}</>;
}
