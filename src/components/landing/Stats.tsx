"use client";

import { Reveal } from "./Reveal";

// Aspirational, market-grounded copy — no fabricated user counts.
const stats = [
  { value: "60s", label: "From signup to first invoice" },
  { value: "3", label: "Roles in one app — landlord, tenant, agent" },
  { value: "0", label: "Spreadsheets required" },
  { value: "100%", label: "Of your rent records, in one place" },
];

export function Stats() {
  return (
    <section className="bg-foundation-700 py-20 text-cryola-50">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cryola-300">
            By the numbers
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Designed to put time back in your day.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <Reveal key={s.label}>
              <div className="text-center">
                <p className="text-4xl font-bold tracking-tight text-cryola-300 sm:text-5xl">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-foundation-50/80">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
