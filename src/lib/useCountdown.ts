"use client";

import { useCallback, useEffect, useState } from "react";

/** Formats a whole number of seconds as mm:ss (e.g. 60 becomes "01:00"). */
export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A one-shot countdown. Call start(seconds) to (re)start it; it ticks down to
 * zero once per second and stops. Used to surface the 60s OTP resend cooldown
 * as a visible mm:ss timer. Mirrors the proven interval pattern from the
 * original phone-verify modal (effect keyed on the remaining value).
 */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const start = useCallback((seconds: number) => setRemaining(seconds), []);
  const reset = useCallback(() => setRemaining(0), []);

  return {
    remaining,
    mmss: formatMmSs(remaining),
    active: remaining > 0,
    start,
    reset,
  };
}
