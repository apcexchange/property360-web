"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, MapPin, Building2 } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
} from "@/components/app/ui";
import { landlordApi, Property, PropertyType } from "@/lib/landlord-api";

// Display label for a property type. Legacy values (apartment/house/bungalow)
// roll up into "Residential" so old buildings keep a sensible label.
function propertyTypeLabel(t: PropertyType | string | undefined): string {
  switch (t) {
    case "residential":
    case "apartment":
    case "house":
    case "bungalow":
      return "Residential";
    case "hostel":
      return "Hostel";
    case "shop":
      return "Shop";
    case "commercial":
      return "Commercial";
    case "land":
      return "Land";
    default:
      return String(t ?? "—");
  }
}

export default function PropertiesPage() {
  const q = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  return (
    <>
      <AppTopbar
        title="Properties"
        subtitle="Buildings and units you manage"
        actions={
          <Link
            href="/app/properties/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Plus className="h-4 w-4" /> Add property
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="mt-4 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No properties yet"
            body="Add your first property to start managing units, tenants, and rent collection."
            cta={{ label: "Add property", href: "/app/properties/new" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {q.data!.map((p) => (
              <PropertyCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function PropertyCard({ p }: { p: Property }) {
  const primary = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
  return (
    <Link
      href={`/app/properties/${p._id}`}
      className="group block overflow-hidden rounded-2xl border border-foundation-700/10 bg-paper transition hover:border-foundation-700/20"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-foundation-700/5">
        {primary?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.url}
            alt={p.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-foundation-700/30">
            <Building2 className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="truncate text-[14.5px] font-semibold text-foundation-700">
          {p.name}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-ink-muted">
          <MapPin className="h-3 w-3" />
          {p.address.city}, {p.address.state}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11.5px] text-ink-muted">
          <span>{p.totalUnits} unit{p.totalUnits === 1 ? "" : "s"}</span>
          <span>·</span>
          <span className="capitalize">{propertyTypeLabel(p.propertyType)}</span>
        </div>
      </div>
    </Link>
  );
}
