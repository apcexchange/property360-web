"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getPropertyCoverImage } from "@/lib/propertyImage";
import { session } from "@/lib/session";

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
  const router = useRouter();
  const params = useSearchParams();
  const user = session.getUser();
  const isAgent = user?.role === "agent";
  const portfolio = params.get("portfolio") === "managed" ? "managed" : "own";
  const q = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });
  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => landlordApi.dashboardStats(),
    enabled: isAgent,
    staleTime: 60_000,
  });
  const ownership = stats.data?.propertyOwnership ?? {};
  const visibleProperties = (q.data ?? []).filter((property) =>
    !isAgent ? true : (ownership[property._id]?.ownership ?? "self") === portfolio
  );
  const ownedCount = (q.data ?? []).filter(
    (property) => (ownership[property._id]?.ownership ?? "self") === "self"
  ).length;
  const managedCount = (q.data ?? []).filter(
    (property) => ownership[property._id]?.ownership === "managed"
  ).length;

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
        {isAgent && (
          <div className="mb-6 rounded-2xl border border-foundation-700/10 bg-paper p-1.5">
            <p className="px-3 pb-2 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Portfolio workspace
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(["own", "managed"] as const).map((option) => {
                const active = portfolio === option;
                const count = option === "own" ? ownedCount : managedCount;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => router.replace(`/app/properties?portfolio=${option}`)}
                    className={`rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-foundation-700 text-paper"
                        : "text-foundation-700 hover:bg-foundation-700/5"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold">
                      {option === "own" ? "My portfolio" : "Managed for landlords"}
                    </span>
                    <span className={`mt-0.5 block text-[11.5px] ${active ? "text-paper/70" : "text-ink-muted"}`}>
                      {count} {count === 1 ? "property" : "properties"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        ) : visibleProperties.length === 0 ? (
          <EmptyState
            title={portfolio === "managed" ? "No managed properties yet" : "No properties yet"}
            body={portfolio === "managed" ? "Ask a landlord to assign you to a property, then it will appear here with its owner clearly shown." : "Add your first property to start managing units, tenants, and rent collection."}
            cta={portfolio === "managed" ? { label: "View landlords", href: "/app/landlords" } : { label: "Add property", href: "/app/properties/new" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProperties.map((p) => (
              <PropertyCard key={p._id} p={p} ownership={ownership[p._id]} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function PropertyCard({ p, ownership }: { p: Property; ownership?: { ownership: "self" | "managed"; managedFor?: { landlordName: string } } }) {
  const coverUrl = getPropertyCoverImage(p);
  return (
    <Link
      href={`/app/properties/${p._id}`}
      className="group block overflow-hidden rounded-2xl border border-foundation-700/10 bg-paper transition hover:border-foundation-700/20"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-foundation-700/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={p.name}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        {ownership?.ownership === "managed" && (
          <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-cryola-200/70 px-2 py-1 text-[10.5px] font-semibold text-foundation-700">
            <Building2 className="h-3 w-3" /> Managed for {ownership.managedFor?.landlordName ?? "landlord"}
          </p>
        )}
        <p className="truncate text-[14.5px] font-semibold text-foundation-700">
          {p.name}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-ink-muted">
          <MapPin className="h-3 w-3" />
          {[p.address?.city, p.address?.state].filter(Boolean).join(", ") || "—"}
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
