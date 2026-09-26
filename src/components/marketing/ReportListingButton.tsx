"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { landlordApi } from "@/lib/landlord-api";
import { session } from "@/lib/session";

const reasons = [
  { value: "fake", label: "May be fake" },
  { value: "unavailable", label: "No longer available" },
  { value: "wrong_price", label: "Price looks wrong" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Something else" },
] as const;

type Reason = (typeof reasons)[number]["value"];

export function ReportListingButton({ unitId }: { unitId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("fake");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!session.getToken()) return null;
  if (state === "sent") {
    return <p className="text-[12.5px] leading-relaxed text-ink-muted">Thank you. Our team will review this listing.</p>;
  }

  async function submit() {
    setState("sending");
    try {
      await landlordApi.reportListing(unitId, reason, detail.trim() || undefined);
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted underline decoration-foundation-700/25 underline-offset-4 transition hover:text-red-700 hover:decoration-red-700"
      >
        <Flag className="h-3.5 w-3.5" /> Report this listing
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-foundation-700/12 bg-paper-deep/45 p-3.5">
      <p className="text-[12.5px] font-semibold text-foundation-700">What&apos;s the issue?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {reasons.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setReason(option.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${reason === option.value ? "border-foundation-700 bg-foundation-700 text-paper" : "border-foundation-700/15 bg-surface text-ink-muted hover:border-foundation-700/35"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Additional context</span>
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Optional detail that will help us review it"
          className="w-full resize-none rounded-lg border border-foundation-700/12 bg-surface px-3 py-2 text-[12px] text-foundation-700 placeholder:text-ink-faint"
        />
      </label>
      {state === "error" && <p className="mt-2 text-[12px] text-red-700">We could not send that report. Please try again.</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={state === "sending"}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-3.5 py-2 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
        >
          {state === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-ink-muted hover:text-foundation-700">Cancel</button>
      </div>
    </div>
  );
}
