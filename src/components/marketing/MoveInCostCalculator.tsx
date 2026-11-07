"use client";

import { useMemo, useState } from "react";

const fields = [
  { key: "rent", label: "Rent due before move-in" },
  { key: "agent", label: "Agent / agency fee" },
  { key: "legal", label: "Legal fee" },
  { key: "agreement", label: "Agreement fee" },
  { key: "caution", label: "Caution fee" },
  { key: "deposit", label: "Security deposit" },
  { key: "service", label: "Service charge due now" },
  { key: "other", label: "Other charges due now" },
] as const;

type CostKey = (typeof fields)[number]["key"];
type Costs = Record<CostKey, string>;

const initialCosts: Costs = {
  rent: "",
  agent: "",
  legal: "",
  agreement: "",
  caution: "",
  deposit: "",
  service: "",
  other: "",
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function MoveInCostCalculator() {
  const [costs, setCosts] = useState<Costs>(initialCosts);
  const totals = useMemo(() => {
    const amount = (key: CostKey) => {
      const value = Number(costs[key]);
      return Number.isFinite(value) && value > 0 ? value : 0;
    };
    const refundable = amount("caution") + amount("deposit");
    const total = fields.reduce((sum, field) => sum + amount(field.key), 0);
    return {
      total,
      refundable,
      otherCosts: total - refundable,
    };
  }, [costs]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-2xl border border-foundation-700/10 bg-white p-5 md:p-7">
        <p className="text-[14px] leading-relaxed text-ink-muted">
          Enter the amounts you have actually been quoted. Leave unknown items
          blank; the calculator does not estimate local prices or decide whether
          a charge is lawful.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.key}
              htmlFor={`cost-${field.key}`}
              className="block text-[13px] font-semibold text-foundation-700"
            >
              {field.label}
              <div className="mt-1.5 flex overflow-hidden rounded-xl border border-foundation-700/15 bg-paper focus-within:border-foundation-700 focus-within:ring-2 focus-within:ring-cryola-300">
                <span className="grid place-items-center border-r border-foundation-700/10 px-3 text-[14px] text-ink-muted">
                  ₦
                </span>
                <input
                  id={`cost-${field.key}`}
                  type="number"
                  min="0"
                  step="100"
                  inputMode="numeric"
                  value={costs[field.key]}
                  onChange={(event) =>
                    setCosts((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] outline-none"
                />
              </div>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCosts(initialCosts)}
          className="mt-5 text-[13px] font-semibold text-foundation-700 underline underline-offset-4"
        >
          Clear amounts
        </button>
      </div>

      <aside className="h-fit rounded-2xl bg-foundation-700 p-6 text-paper lg:sticky lg:top-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
          Your estimate
        </p>
        <p className="mt-3 text-[13px] text-paper/70">Total entered for move-in</p>
        <p className="mt-1 font-display text-[clamp(2rem,4vw,2.7rem)] font-bold leading-tight">
          {naira.format(totals.total)}
        </p>
        <div className="mt-6 space-y-3 border-t border-paper/15 pt-5 text-[13px]">
          <div className="flex justify-between gap-4">
            <span className="text-paper/70">Potentially refundable</span>
            <strong>{naira.format(totals.refundable)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-paper/70">Rent, fees &amp; other entered costs</span>
            <strong>{naira.format(totals.otherCosts)}</strong>
          </div>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-paper/65">
          “Potentially refundable” only groups the caution fee and security
          deposit because you entered them under those labels. Confirm the
          agreement and refund terms; the calculator cannot determine whether a
          payment is legally refundable.
        </p>
      </aside>
    </div>
  );
}
