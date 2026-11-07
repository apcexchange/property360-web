"use client";

import { useState } from "react";

export function GuideChecklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));

  return (
    <section
      className="guide-checklist mt-12 rounded-2xl border border-foundation-700/15 bg-white p-6 md:p-8"
      aria-labelledby="guide-checklist-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Take this with you</p>
          <h2
            id="guide-checklist-title"
            className="mt-2 font-display text-[22px] font-bold text-foundation-700"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="guide-print-button rounded-full bg-foundation-700 px-4 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
        >
          Print checklist
        </button>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item, index) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-foundation-700">
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(event) =>
                  setChecked((previous) =>
                    previous.map((value, itemIndex) =>
                      itemIndex === index ? event.target.checked : value,
                    ),
                  )
                }
                className="mt-1 h-4 w-4 accent-[#13272C]"
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="guide-print-footer mt-5 hidden text-[11px] text-ink-muted">
        Property360 · Practical information, not legal advice.
      </p>
    </section>
  );
}
