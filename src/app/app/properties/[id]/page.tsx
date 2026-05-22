"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, UserPlus, Receipt, FileText } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
} from "@/components/app/ui";
import { landlordApi, Unit } from "@/lib/landlord-api";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["properties", id],
    queryFn: () => landlordApi.getProperty(id),
    enabled: !!id,
  });

  const property = q.data?.property;
  const units = q.data?.units ?? [];

  const occupiedCount = units.filter((u) => u.isOccupied).length;

  return (
    <>
      <AppTopbar
        title={property?.name ?? "Property"}
        subtitle={
          property
            ? `${property.address.city}, ${property.address.state} · ${property.totalUnits} unit${
                property.totalUnits === 1 ? "" : "s"
              }`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/app/properties"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {id && (
              <Link
                href={`/app/properties/${id}/agreement-templates`}
                className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                <FileText className="h-4 w-4" /> Templates
              </Link>
            )}
          </div>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="mt-4 h-5 w-1/2" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </Card>
        ) : q.isError || !property ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Property not found."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            {property.images && property.images.length > 0 && (
              <Card className="overflow-hidden">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {property.images.slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      className={`aspect-square bg-foundation-700/5 ${
                        i === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Image ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Details
                </h2>
                <p className="mt-2 text-[13.5px] text-foundation-700">
                  {property.description || "No description."}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-muted">
                  <MapPin className="h-4 w-4" />
                  {property.address.street}, {property.address.city},{" "}
                  {property.address.state}
                  {property.address.postalCode
                    ? ` · ${property.address.postalCode}`
                    : ""}
                </div>
                {property.amenities && property.amenities.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Amenities
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {property.amenities.map((a) => (
                        <span
                          key={a}
                          className="rounded-full border border-foundation-700/10 bg-surface px-3 py-1 text-[12px] text-foundation-700"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <div className="space-y-3">
                <Card className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Occupancy
                  </p>
                  <p className="mt-2 font-display text-[24px] font-extrabold text-foundation-700">
                    {occupiedCount} / {units.length}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {units.length - occupiedCount} vacant
                  </p>
                </Card>
                <Link
                  href="/app/tenants/new"
                  className="flex items-center justify-between rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Add tenant
                    </p>
                    <p className="text-[12px] text-ink-muted">
                      Assign to a vacant unit
                    </p>
                  </div>
                  <UserPlus className="h-4 w-4 text-foundation-700" />
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Units
              </h2>
              {units.length === 0 ? (
                <Card className="p-6 text-center text-[13px] text-ink-muted">
                  No units configured.
                </Card>
              ) : (
                <Card className="divide-y divide-foundation-700/10">
                  {units.map((u) => (
                    <UnitRow key={u._id} u={u} />
                  ))}
                </Card>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

function UnitRow({ u }: { u: Unit }) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold text-foundation-700">
            Unit {u.unitNumber}
          </p>
          <StatusPill
            label={u.isOccupied ? "Occupied" : "Vacant"}
            tone={u.isOccupied ? "good" : "warn"}
          />
        </div>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          {u.bedrooms} bed · {u.bathrooms} bath
          {u.size ? ` · ${u.size}m²` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13.5px] font-semibold text-foundation-700">
          {formatNgn(u.rentAmount)}
        </p>
        <p className="text-[11.5px] text-ink-muted">
          /{u.rentPeriod ?? "month"}
        </p>
      </div>
      {!u.isOccupied && (
        <Link
          href="/app/tenants/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <UserPlus className="mr-1 inline h-3 w-3" /> Assign
        </Link>
      )}
      {u.isOccupied && (
        <Link
          href="/app/invoices/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <Receipt className="mr-1 inline h-3 w-3" /> Invoice
        </Link>
      )}
    </div>
  );
}
