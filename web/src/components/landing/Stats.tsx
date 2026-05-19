"use client";

import { Reveal } from "./Reveal";
import { CountUp } from "./CountUp";

// Aspirational, market-grounded copy — no fabricated user counts.
const stats: Array<{
  value: number | string;
  suffix?: string;
  label: string;
  static?: boolean;
}> = [
  { value: 60, suffix: "s", label: "From signup to first invoice" },
  { value: 3, label: "Roles in one app — landlord, tenant, agent" },
  { value: "0", label: "Spreadsheets required", static: true },
  { value: 100, suffix: "%", label: "Of your rent records, in one place" },
];

export function Stats() {
  return (
    <section className="relative overflow-hidden bg-foundation-700 py-24 text-paper md:py-28">
      <div className="pointer-events-none absolute -top-32 right-0 h-[26rem] w-[26rem] rounded-full bg-cryola-400/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cryola-300">
            By the numbers
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[clamp(1.85rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Designed to put time back in your day.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-foundation-600/60 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="bg-foundation-700 px-6 py-10 text-center">
                <p className="text-[clamp(2.5rem,5vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-cryola-300 tabular">
                  {s.static ? (
                    s.value
                  ) : (
                    <CountUp to={s.value as number} suffix={s.suffix} duration={1600} />
                  )}
                </p>
                <p className="mx-auto mt-3 max-w-[14rem] text-[13.5px] leading-snug text-paper/70">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
