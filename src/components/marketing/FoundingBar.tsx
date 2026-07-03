"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FOUNDING, naira } from "./foundingOffer";
import { getFoundingStatus, FoundingStatus } from "@/lib/founding-api";

/**
 * Slim launch-announcement ribbon above the Nav on the landing and pricing
 * pages. Reads the live slot count and deep-links to the full Founding 50
 * section (#founding on /pricing).
 */
export function FoundingBar() {
  const [status, setStatus] = useState<FoundingStatus | null>(null);

  useEffect(() => {
    getFoundingStatus().then(setStatus);
  }, []);

  const total = status?.total ?? FOUNDING.slots;
  const remaining = status ? status.remaining : FOUNDING.slots;
  const soldOut = !!status && status.enabled && status.remaining <= 0;

  return (
    <Link
      href="/pricing#founding"
      className="group block bg-foundation-700 text-paper transition-colors hover:bg-foundation-800"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-6 py-2 text-center text-[12.5px] leading-tight sm:gap-3">
        <span className="live-dot inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cryola-300" />
        <span className="font-semibold text-cryola-300">The Founding 50</span>
        {soldOut ? (
          <span className="text-paper/85">
            is full, <span className="underline-offset-2 group-hover:underline">join the waitlist</span>
          </span>
        ) : (
          <>
            <span className="hidden text-paper/85 sm:inline">
              First {total} landlords lock {FOUNDING.tier} at{" "}
              {naira(FOUNDING.foundingAnnualNgn)}/yr, forever.
            </span>
            <span className="text-paper/85 sm:hidden">
              {FOUNDING.tier} at {naira(FOUNDING.foundingAnnualNgn)}/yr forever
            </span>
            {status && remaining > 0 && remaining < total && (
              <span className="hidden shrink-0 rounded-full bg-cryola-300/15 px-2 py-0.5 text-[11px] font-semibold text-cryola-300 md:inline">
                {remaining} left
              </span>
            )}
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-cryola-300 underline-offset-2 group-hover:underline">
              Claim a spot
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
