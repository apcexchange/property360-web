"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { AppTopbar } from "@/components/app/Topbar";
import { Card, PageContainer } from "@/components/app/ui";
import { formatNairaFull } from "@/lib/listings-api";

type Booking = { id: string; checkIn: string; checkOut: string; nights: number; guests: number; totalAmount: number; status: string; expiresAt?: string; property?: { name: string; address?: { city?: string } }; unit?: { listingTitle?: string; unitNumber?: string } };

export default function MyHotelBookingsPage() {
  const bookings = useQuery({ queryKey: ["hotel-bookings", "mine"], queryFn: async () => unwrap<Booking[]>((await api.get("/hotel-bookings/mine")).data) });
  const qc = useQueryClient();
  const pay = useMutation({ mutationFn: async (id: string) => unwrap<{ authorizationUrl: string }>((await api.post(`/hotel-bookings/${id}/pay`)).data), onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl) });
  const cancel = useMutation({ mutationFn: (id: string) => api.post(`/hotel-bookings/${id}/cancel`), onSuccess: () => qc.invalidateQueries({ queryKey: ["hotel-bookings", "mine"] }) });

  return <><AppTopbar title="My stays" subtitle="Your hotel booking requests" /><PageContainer><div className="grid gap-4">
    {bookings.isLoading && <p className="text-sm text-ink-muted">Loading your stays…</p>}
    {bookings.data?.map((booking) => <Card key={booking.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-foundation-700">{booking.unit?.listingTitle || booking.property?.name || "Hotel room"}</p><p className="mt-1 text-sm text-ink-muted">{new Date(booking.checkIn).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – {new Date(booking.checkOut).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} · {booking.nights} nights · {booking.guests} guest{booking.guests === 1 ? "" : "s"}</p></div><span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold capitalize">{booking.status}</span></div><p className="mt-3 font-semibold">{formatNairaFull(booking.totalAmount)}</p>{booking.status === "pending" && booking.expiresAt && <p className="mt-2 text-xs text-ink-muted">The hotel has until {new Date(booking.expiresAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} to respond.</p>}{booking.status === "confirmed" && <button onClick={() => pay.mutate(booking.id)} disabled={pay.isPending} className="mt-3 rounded-full bg-foundation-700 px-4 py-2 text-xs font-semibold text-paper">{pay.isPending ? "Opening payment…" : "Pay securely"}</button>}{["pending", "confirmed"].includes(booking.status) && <button onClick={() => cancel.mutate(booking.id)} disabled={cancel.isPending} className="ml-2 mt-3 rounded-full border border-foundation-700/20 px-4 py-2 text-xs font-semibold">Cancel request</button>}</Card>)}
    {!bookings.isLoading && !bookings.data?.length && <Card className="p-8 text-sm text-ink-muted">No hotel stays yet. Find a hotel room and choose your dates to get started.</Card>}
  </div></PageContainer></>;
}
