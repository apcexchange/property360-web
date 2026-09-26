"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { landlordApi } from "@/lib/landlord-api";
import { session } from "@/lib/session";

export function ReportListingButton({ unitId }: { unitId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"fake" | "unavailable" | "wrong_price" | "duplicate" | "other">("fake");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (!session.getToken()) return null;
  if (sent) return <p className="text-[12px] text-ink-muted">Thanks—our team will review this listing.</p>;
  return <div>{open ? <div className="flex flex-wrap items-center gap-2"><select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="rounded-lg border border-foundation-700/15 px-2 py-1 text-[12px]"><option value="fake">Fake listing</option><option value="unavailable">Unavailable</option><option value="wrong_price">Wrong price</option><option value="duplicate">Duplicate</option><option value="other">Other</option></select><button onClick={async () => { try { setError(""); await landlordApi.reportListing(unitId, reason); setSent(true); } catch { setError("Couldn’t send report. Please try again."); } }} className="rounded-lg bg-red-700 px-2.5 py-1 text-[12px] font-semibold text-white">Send report</button><button onClick={() => setOpen(false)} className="text-[12px] text-ink-muted">Cancel</button>{error && <p className="w-full text-[12px] text-red-700">{error}</p>}</div> : <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[12px] text-ink-muted underline underline-offset-4 hover:text-red-700"><Flag className="h-3.5 w-3.5" /> Report this listing</button>}</div>;
}
