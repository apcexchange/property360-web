"use client";

import Link from "next/link";
import { useState } from "react";
import { AxiosError } from "axios";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { session } from "@/lib/session";

export function StartPurchasePlanCTA({ unitId, listingHref }: { unitId: string; listingHref: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session.getUser();
  if (!user) return <Link href={`/login?next=${encodeURIComponent(listingHref)}`} className="flex w-full items-center justify-center rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper">Sign in to start payment plan</Link>;
  if (user.role !== "tenant") return <p className="rounded-xl bg-paper-deep/50 px-4 py-3 text-[12.5px] text-ink-muted">Purchase plans can be started from a buyer account.</p>;
  if (done) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"><p className="flex items-center gap-1.5 font-semibold"><Check className="h-4 w-4" />Your payment plan is ready.</p><Link className="mt-1 inline-block text-[12px] font-semibold underline" href="/app/purchases">View your purchase</Link></div>;
  return <div className="space-y-2"><button type="button" disabled={loading} onClick={async () => { setLoading(true); setError(null); try { await api.post(`/sale-purchases/units/${unitId}`); setDone(true); } catch (err) { const apiError = err as AxiosError<{ message?: string }>; setError(apiError.response?.data?.message ?? "Could not start your plan."); } finally { setLoading(false); } }} className="flex w-full items-center justify-center rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start payment plan"}</button>{error && <p className="text-center text-[12px] text-red-700">{error}</p>}</div>;
}
