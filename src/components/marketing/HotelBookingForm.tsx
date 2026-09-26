"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, unwrap } from "@/lib/api";
import { session } from "@/lib/session";
import { formatNairaFull } from "@/lib/listings-api";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function HotelBookingForm({ unitId, nightlyRate, minimumStay = 1, maxGuests = 6 }: { unitId: string; nightlyRate: number; minimumStay?: number; maxGuests?: number }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<{ nights: number; totalAmount: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const minDate = localDate();
  const payload = { checkIn, checkOut, guests: Number(guests) };

  async function getQuote() {
    try { setBusy(true); setError(""); const res = await api.post(`/hotel-bookings/quote/${unitId}`, payload); setQuote(unwrap(res.data)); }
    catch (e: any) { setQuote(null); setError(e.response?.data?.message ?? "Choose valid available dates."); }
    finally { setBusy(false); }
  }
  async function book() {
    if (!session.getToken()) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    try { setBusy(true); setError(""); await api.post(`/hotel-bookings/rooms/${unitId}`, { ...payload, guestNote: message || undefined }); router.push("/me/bookings"); }
    catch (e: any) { setError(e.response?.data?.message ?? "Unable to submit booking."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2"><label className="text-[12px] font-medium">Check in<input required min={minDate} type="date" value={checkIn} onChange={(e) => { setCheckIn(e.target.value); setQuote(null); }} className="mt-1 w-full rounded-lg border border-foundation-700/15 bg-paper px-2 py-2" /></label><label className="text-[12px] font-medium">Check out<input required min={checkIn || minDate} type="date" value={checkOut} onChange={(e) => { setCheckOut(e.target.value); setQuote(null); }} className="mt-1 w-full rounded-lg border border-foundation-700/15 bg-paper px-2 py-2" /></label></div>
    <label className="block text-[12px] font-medium">Guests<select value={guests} onChange={(e) => { setGuests(e.target.value); setQuote(null); }} className="mt-1 w-full rounded-lg border border-foundation-700/15 bg-paper px-2 py-2">{Array.from({ length: Math.min(Math.max(maxGuests, 1), 20) }, (_, index) => index + 1).map((n) => <option key={n}>{n}</option>)}</select></label>
    <button type="button" onClick={getQuote} disabled={busy || !checkIn || !checkOut} className="w-full rounded-full border border-foundation-700/20 py-2.5 text-[13px] font-semibold disabled:opacity-50">{busy ? "Checking…" : "Check availability"}</button>
    {quote && <div className="rounded-xl bg-paper-deep p-3 text-[13px]"><strong>{quote.nights} night{quote.nights === 1 ? "" : "s"} · {formatNairaFull(quote.totalAmount)}</strong><p className="mt-1 text-ink-muted">From {formatNairaFull(nightlyRate)} per night. Minimum stay: {minimumStay}. Up to {maxGuests} guests.</p><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Note to hotel (optional)" className="mt-3 w-full rounded-lg border border-foundation-700/15 bg-paper p-2" /><button type="button" onClick={book} disabled={busy} className="mt-2 w-full rounded-full bg-foundation-700 py-2.5 text-[13px] font-semibold text-paper">Request booking</button></div>}
    {error && <p className="text-[12px] text-error">{error}</p>}
  </div>;
}
