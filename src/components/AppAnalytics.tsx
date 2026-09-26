"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Wraps Vercel's <Analytics/> (a function prop can't be passed to it
 * directly from the server-rendered root layout) so we can drop the query
 * string from every /email/* pageview before it's sent. Those pages carry a
 * one-click unsubscribe/opt-in token in ?token=, which must never end up in
 * an analytics event.
 */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.url.includes("/email/")) {
    const [path] = event.url.split("?");
    return { ...event, url: path };
  }
  return event;
}

export function AppAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
