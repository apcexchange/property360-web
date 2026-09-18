"use client";

import { useEffect, useState } from "react";
import { optOut } from "@/lib/analytics";

/**
 * Lightweight, non-blocking cookie notice (Nigeria / NDPR). Shows once until the
 * visitor acknowledges or declines. "Decline" opts the browser out of capture.
 * Kept intentionally simple: an informational bar, not a consent wall.
 */
const SEEN_KEY = "ph_seen";
const OPT_OUT_KEY = "ph_opt_out";

export function ConsentNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem(SEEN_KEY) === "1";
    const opted = window.localStorage.getItem(OPT_OUT_KEY) === "1";
    if (!seen && !opted) setShow(true);
  }, []);

  if (!show) return null;

  const acknowledge = () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  };

  const decline = () => {
    optOut();
    window.localStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-foundation-700 p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-snug text-white/90">
          We use cookies to understand site traffic and improve Property360. No
          personal data is sold.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={decline}
            className="text-sm font-medium text-white/70 underline underline-offset-4 hover:text-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-full bg-cryola-400 px-4 py-2 text-sm font-semibold text-foundation-900 hover:bg-cryola-300"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
