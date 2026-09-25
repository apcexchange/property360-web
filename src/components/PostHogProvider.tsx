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
 * The /email/* pages (one-click unsubscribe/opt-in links) are never
 * identified or tracked at all: before_send already scrubs the token out of
 * anything that does get sent, but these links are meant to be usable
 * without creating any analytics trail, so we skip capture here entirely
 * rather than rely solely on the scrub.
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
