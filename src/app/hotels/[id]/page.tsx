import { notFound } from "next/navigation";
import Image from "next/image";
import { BedDouble, CalendarDays, MapPin, ShieldCheck, Star, Users } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { HotelBookingForm } from "@/components/marketing/HotelBookingForm";
import { formatNairaFull } from "@/lib/listings-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.property360.africa/api/v1";

type Hotel = {
  name: string;
  description?: string;
  images?: string[];
  amenities?: string[];
  address?: { city?: string; state?: string };
  hotelProfile?: { checkInTime?: string; checkOutTime?: string; cancellationPolicy?: string; contactPhone?: string };
};
type Room = {
  _id: string;
  id?: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  rentAmount: number;
  listingTitle?: string;
  listingDescription?: string;
  listingDetails?: { minimumStayNights?: number; maxGuests?: number; serviceCharge?: number };
};
type HotelReview = {
  _id: string;
  rating: number;
  comment?: string;
  hostReply?: string;
  createdAt?: string;
  guest?: { firstName?: string };
};
type ReviewData = { reviews: HotelReview[]; averageRating: number; reviewCount: number };

export default async function HotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hotelResponse, reviewResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/hotels/${id}`, { next: { revalidate: 60 } }),
    fetch(`${API_BASE_URL}/hotel-reviews/hotels/${id}`, { next: { revalidate: 60 } }),
  ]);
  if (!hotelResponse.ok) notFound();

  const payload = (await hotelResponse.json()) as { data: { hotel: Hotel; rooms: Room[] } };
  const reviewPayload = reviewResponse.ok
    ? ((await reviewResponse.json()) as { data?: ReviewData })
    : undefined;
  const reviews = reviewPayload?.data ?? { reviews: [], averageRating: 0, reviewCount: 0 };
  const { hotel, rooms } = payload.data;
  const location = [hotel.address?.city, hotel.address?.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <main>
        <section className="border-b border-foundation-700/10 bg-paper-deep/45">
          <div className="mx-auto grid max-w-6xl gap-9 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-16">
            <div className="relative overflow-hidden rounded-2xl bg-foundation-700/10">
              {hotel.images?.[0] ? (
                <Image src={hotel.images[0]} alt={hotel.name} width={1200} height={780} className="aspect-[4/3] w-full object-cover" priority />
              ) : (
                <div className="aspect-[4/3] bg-foundation-700/10" />
              )}
              {hotel.images && hotel.images.length > 1 && <span className="absolute bottom-4 left-4 rounded-full bg-foundation-800/85 px-3 py-1.5 text-[11px] font-semibold text-paper">{hotel.images.length} photos</span>}
            </div>

            <div>
              <p className="eyebrow text-foundation-700">Hotel / guesthouse</p>
              <h1 className="mt-4 font-display text-[clamp(2.6rem,5vw,4.5rem)] font-extrabold leading-[0.96] tracking-[-0.045em] text-foundation-700">{hotel.name}</h1>
              {location && <p className="mt-4 flex items-center gap-1.5 text-[14px] text-ink-muted"><MapPin className="h-4 w-4" />{location}</p>}
              {hotel.description && <p className="mt-5 max-w-xl text-[16px] leading-[1.65] text-ink-muted">{hotel.description}</p>}
              <div className="mt-7 grid grid-cols-3 border-y border-foundation-700/12 py-4 text-[12px] text-ink-muted">
                <div className="border-r border-foundation-700/12 pr-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-faint">Check-in</span><span className="mt-1 block font-semibold text-foundation-700">{hotel.hotelProfile?.checkInTime || "Ask hotel"}</span></div>
                <div className="border-r border-foundation-700/12 px-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-faint">Check-out</span><span className="mt-1 block font-semibold text-foundation-700">{hotel.hotelProfile?.checkOutTime || "Ask hotel"}</span></div>
                <div className="pl-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-faint">Guest reviews</span><span className="mt-1 flex items-center gap-1 font-semibold text-foundation-700">{reviews.reviewCount > 0 ? <><Star className="h-3.5 w-3.5 fill-cryola-400 text-cryola-500" />{reviews.averageRating.toFixed(1)} · {reviews.reviewCount}</> : "New on Property360"}</span></div>
              </div>
              {hotel.amenities?.length ? <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">{hotel.amenities.map((item) => <span key={item} className="text-[12px] font-medium text-foundation-700">{item}</span>)}</div> : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Choose your room</p><h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1] tracking-[-0.035em]">Available stays</h2></div>
            <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">Select dates to check availability and see the full stay amount before requesting a booking.</p>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {rooms.map((room) => <article key={room._id} className="border-y border-foundation-700/12 py-6 lg:border-t lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-[18px] font-semibold tracking-[-0.015em]">{room.listingTitle || `Room ${room.unitNumber}`}</h3><p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{room.listingDescription || "A room available to book through Property360."}</p></div><p className="shrink-0 text-right text-[17px] font-semibold">{formatNairaFull(room.rentAmount)}<span className="mt-0.5 block text-[11px] font-normal text-ink-muted">per night</span></p></div>
              <div className="mt-5 flex gap-4 text-[12.5px] text-ink-muted"><span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{room.bedrooms || 1} bed</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />Up to {room.listingDetails?.maxGuests ?? 6} guests</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Min. {room.listingDetails?.minimumStayNights ?? 1} night</span></div>
              <div className="mt-5 border-t border-foundation-700/10 pt-5"><HotelBookingForm unitId={room.id || room._id} nightlyRate={room.rentAmount} minimumStay={room.listingDetails?.minimumStayNights} maxGuests={room.listingDetails?.maxGuests} /></div>
            </article>)}
          </div>
          {!rooms.length && <p className="mt-8 border-l-2 border-cryola-400 pl-4 text-[14px] text-ink-muted">No rooms are available to book right now. Please check back soon.</p>}
        </section>

        <section className="border-t border-foundation-700/10 bg-paper-deep/35 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div><p className="eyebrow">Guest reviews</p><h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1] tracking-[-0.035em]">{reviews.reviewCount > 0 ? "Stays, in guests’ own words." : "A new stay, ready to be reviewed."}</h2><p className="mt-5 max-w-sm text-[14px] leading-[1.65] text-ink-muted">Only guests with a completed stay can leave a review. That keeps this feedback tied to real bookings.</p>{reviews.reviewCount > 0 && <p className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-foundation-700"><Star className="h-4 w-4 fill-cryola-400 text-cryola-500" />{reviews.averageRating.toFixed(1)} average from {reviews.reviewCount} {reviews.reviewCount === 1 ? "review" : "reviews"}</p>}</div>
            <div className="divide-y divide-foundation-700/12 border-y border-foundation-700/12">
              {reviews.reviews.length > 0 ? reviews.reviews.slice(0, 4).map((review) => <article key={review._id} className="py-6"><div className="flex items-center justify-between gap-4"><p className="text-[14px] font-semibold">{review.guest?.firstName || "Guest"}</p><Stars value={review.rating} /></div>{review.comment && <p className="mt-3 text-[14px] leading-[1.65] text-ink-muted">{review.comment}</p>}{review.hostReply && <div className="mt-4 border-l-2 border-cryola-400 pl-3 text-[13px] leading-relaxed text-ink-muted"><span className="font-semibold text-foundation-700">Reply from the hotel</span><br />{review.hostReply}</div>}</article>) : <div className="py-8"><p className="text-[14px] font-semibold text-foundation-700">No completed-stay reviews yet.</p><p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">The first guest feedback will appear here after a completed booking.</p></div>}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-6 border-y border-foundation-700/10 py-7 md:grid-cols-[0.9fr_1.1fr]">
            <div><p className="eyebrow">Booking with confidence</p><p className="mt-3 flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foundation-700" />Check availability first, then request the stay through Property360. Your booking details stay with the room.</p></div>
            <div>{hotel.hotelProfile?.cancellationPolicy ? <><p className="text-[13px] font-semibold text-foundation-700">Cancellation policy</p><p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{hotel.hotelProfile.cancellationPolicy}</p></> : <p className="text-[13.5px] text-ink-muted">Ask the hotel about its cancellation policy before you book.</p>}{hotel.hotelProfile?.contactPhone && <a href={`tel:${hotel.hotelProfile.contactPhone}`} className="mt-4 inline-flex text-[13px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">Call hotel: {hotel.hotelProfile.contactPhone}</a>}</div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return <span className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < value ? "fill-cryola-400 text-cryola-500" : "text-foundation-700/15"}`} />)}</span>;
}
