import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, BedDouble, Users } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { HotelBookingForm } from "@/components/marketing/HotelBookingForm";
import { formatNairaFull } from "@/lib/listings-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.property360.africa/api/v1";

type Hotel = { name: string; description?: string; images?: string[]; amenities?: string[]; address?: { city?: string; state?: string }; hotelProfile?: { checkInTime?: string; checkOutTime?: string; cancellationPolicy?: string; contactPhone?: string } };
type Room = { _id: string; id?: string; unitNumber: string; bedrooms?: number; bathrooms?: number; rentAmount: number; listingTitle?: string; listingDescription?: string; listingDetails?: { minimumStayNights?: number; maxGuests?: number; serviceCharge?: number } };

export default async function HotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_BASE_URL}/hotels/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) notFound();
  const payload = await res.json() as { data: { hotel: Hotel; rooms: Room[] } };
  const { hotel, rooms } = payload.data;

  return <div className="min-h-screen bg-paper text-foundation-700">
    <Nav />
    <main>
      <section className="border-b border-foundation-700/10 bg-paper-deep/50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          {hotel.images?.[0] && <Image src={hotel.images[0]} alt={hotel.name} width={1200} height={520} className="mb-8 h-64 w-full rounded-3xl object-cover sm:h-80" priority />}
          <p className="eyebrow">Hotel / guesthouse</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight">{hotel.name}</h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted"><MapPin className="h-4 w-4" />{[hotel.address?.city, hotel.address?.state].filter(Boolean).join(", ")}</p>
          {hotel.description && <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-ink-muted">{hotel.description}</p>}
          {hotel.amenities?.length ? <div className="mt-6 flex flex-wrap gap-2">{hotel.amenities.map((item) => <span key={item} className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-medium">{item}</span>)}</div> : null}
          {(hotel.hotelProfile?.checkInTime || hotel.hotelProfile?.checkOutTime || hotel.hotelProfile?.contactPhone) && <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-foundation-700/10 bg-surface px-4 py-3 text-sm text-ink-muted"><span>Check-in: <strong className="text-foundation-700">{hotel.hotelProfile?.checkInTime || "Ask hotel"}</strong></span><span>Check-out: <strong className="text-foundation-700">{hotel.hotelProfile?.checkOutTime || "Ask hotel"}</strong></span>{hotel.hotelProfile?.contactPhone && <a href={`tel:${hotel.hotelProfile.contactPhone}`} className="font-semibold text-foundation-700 underline">Call hotel: {hotel.hotelProfile.contactPhone}</a>}</div>}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl font-extrabold">Available rooms</h2>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {rooms.map((room) => <article key={room._id} className="rounded-2xl border border-foundation-700/10 bg-surface p-6">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold">{room.listingTitle || `Room ${room.unitNumber}`}</h3><p className="mt-1 text-sm text-ink-muted">{room.listingDescription || "Hotel room"}</p></div><p className="text-right font-bold">{formatNairaFull(room.rentAmount)}<span className="block text-xs font-normal text-ink-muted">per night</span></p></div>
            <div className="mt-4 flex gap-4 text-sm text-ink-muted"><span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{room.bedrooms || 1} bed</span><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />Up to {room.listingDetails?.maxGuests ?? 6} guests</span></div>
            <div className="mt-5 border-t border-foundation-700/10 pt-5"><HotelBookingForm unitId={room.id || room._id} nightlyRate={room.rentAmount} minimumStay={room.listingDetails?.minimumStayNights} maxGuests={room.listingDetails?.maxGuests} /></div>
          </article>)}
        </div>
        {!rooms.length && <p className="mt-6 text-ink-muted">No rooms are available to book right now.</p>}
      </section>
      {hotel.hotelProfile?.cancellationPolicy && <section className="border-t border-foundation-700/10"><div className="mx-auto max-w-6xl px-6 py-10"><h2 className="font-semibold">Booking policy</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{hotel.hotelProfile.cancellationPolicy}</p></div></section>}
    </main>
    <Footer />
  </div>;
}
