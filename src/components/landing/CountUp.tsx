"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** The target number to count to. */
  to: number;
  /** Optional prefix (e.g. "$"). */
  prefix?: string;
  /** Optional suffix (e.g. "%", "+", "k"). */
  suffix?: string;
  /** Animation duration in ms. Default 1400. */
  duration?: number;
  /** Decimal places to show. Default 0. */
  decimals?: number;
  /** Where in the viewport to start (CSS rootMargin). Default "-80px". */
  rootMargin?: string;
  className?: string;
}

/**
 * Counts from 0 → `to` once when scrolled into view. ease-out cubic so the
 * number decelerates to its final value rather than racing in linearly.
 */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1400,
  decimals = 0,
  rootMargin = "-80px",
  className,
}: Props) {
  const [value, setValue] = useState(0);
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honor reduced-motion: jump straight to the final value.
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      setValue(to);
      return;
    }

    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(1, elapsed / duration);
              // ease-out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(to * eased);
              if (progress < 1) requestAnimationFrame(tick);
              else setValue(to);
            };
            requestAnimationFrame(tick);
            observer.disconnect();
          }
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration, rootMargin]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {value.toLocaleString("en-NG", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
