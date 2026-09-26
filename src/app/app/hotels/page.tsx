"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Hotel } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import { Card, EmptyState, ErrorBox, PageContainer, Skeleton } from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

export default function HotelsPage() {
  const hotels = useQuery({
    queryKey: ["properties", "hotels"],
    queryFn: async () => (await landlordApi.listProperties()).filter((property) => property.propertyType === "hotel"),
  });

  return (
    <>
      <AppTopbar title="Hotel desk" subtitle="Rooms, bookings and your guest-facing hotel pages" />
      <PageContainer>
        {hotels.isLoading ? <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Card key={i} className="p-5"><Skeleton className="h-5 w-40" /><Skeleton className="mt-3 h-3 w-56" /></Card>)}</div>
          : hotels.isError ? <ErrorBox message={(hotels.error as Error).message} onRetry={() => hotels.refetch()} />
          : hotels.data?.length ? <div className="grid gap-4 sm:grid-cols-2">{hotels.data.map((hotel) => (
            <Link key={hotel._id} href={`/app/hotels/${hotel._id}`} className="group rounded-2xl border border-foundation-700/10 bg-paper p-5 transition hover:border-foundation-700/25">
              <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cryola-200 text-foundation-700"><Hotel className="h-5 w-5" /></span><ChevronRight className="mt-2 h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5" /></div>
              <p className="mt-5 text-[16px] font-semibold text-foundation-700">{hotel.name}</p>
              <p className="mt-1 text-[12.5px] text-ink-muted">{[hotel.address.city, hotel.address.state].filter(Boolean).join(", ")} · {hotel.totalUnits} rooms</p>
              <p className="mt-4 text-[12px] font-semibold text-foundation-700">Open operator desk</p>
            </Link>
          ))}</div>
          : <EmptyState title="No hotel properties yet" body="Create a property with the Hotel type, add rooms as shortlets, and it will receive its own operator desk and public booking page." cta={{ label: "Add a hotel", href: "/app/properties/new" }} />}
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-cryola-50/60 p-4 text-[13px] text-ink-muted"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-foundation-700" /><p>A hotel&apos;s public page is created automatically once its rooms are listed. The hotel desk is where its team handles operations.</p></div>
      </PageContainer>
    </>
  );
}
