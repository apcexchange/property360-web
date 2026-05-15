"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  /** Seconds for one full loop. Slower = more relaxed. Default 40s. */
  durationSeconds?: number;
  /** Reverse direction. */
  reverse?: boolean;
  className?: string;
}

/**
 * CSS-driven endless marquee. Renders the children twice back-to-back and
 * translates the track by -50% — giving a seamless loop. Pauses on hover and
 * respects prefers-reduced-motion via globals.css.
 */
export function Marquee({
  children,
  durationSeconds = 40,
  reverse = false,
  className = "",
}: Props) {
  return (
    <div
      className={`group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}
    >
      <div
        className="marquee-track flex w-max items-center gap-12"
        style={{
          ["--marquee-duration" as string]: `${durationSeconds}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center gap-12">
          {children}
        </div>
      </div>
    </div>
  );
}
