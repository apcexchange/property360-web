"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  Receipt,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { AxiosError } from "axios";
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
import { PropertyMediaCard } from "@/components/app/PropertyMedia";
import { useToast } from "@/components/ui/Toast";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const q = useQuery({
    queryKey: ["properties", id],
    queryFn: () => landlordApi.getProperty(id),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => landlordApi.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Property deleted");
      router.replace("/app/properties");
    },
    onError: (err) => {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't delete this property.")
      );
    },
  });

  // Legacy rows can carry a null/empty name; `.trim()` on it would throw and
  // crash the whole page on render. Coerce, and never let an empty name match
  // an empty input (which would silently arm the delete button).
  const propertyName = (q.data?.property?.name ?? "").trim();
  const nameMatches =
    !!q.data?.property &&
    propertyName.length > 0 &&
    deleteConfirm.trim().toLowerCase() === propertyName.toLowerCase();

  const property = q.data?.property;
  const units = q.data?.units ?? [];

  const occupiedCount = units.filter((u) => u.isOccupied).length;

  return (
    <>
      <AppTopbar
        title={property?.name ?? "Property"}
        subtitle={
          property
            ? `${[property.address?.city, property.address?.state].filter(Boolean).join(", ")} · ${property.totalUnits} unit${
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
            <PropertyMediaCard property={property} propertyId={id} />


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
                  {[property.address?.street, property.address?.city, property.address?.state]
                    .filter(Boolean)
                    .join(", ") || "—"}
                  {property.address?.postalCode
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
                {id && (
                  <Link
                    href={`/app/properties/${id}/agreement-templates`}
                    className="flex items-center justify-between rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-foundation-700">
                        Tenancy agreements
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        Upload, type, or AI-generate a template
                      </p>
                    </div>
                    <FileText className="h-4 w-4 text-foundation-700" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirm("");
                    setShowDelete(true);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50/60 p-4 text-left transition hover:border-red-300 hover:bg-red-50"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-red-700">
                      Delete property
                    </p>
                    <p className="text-[12px] text-red-600/80">
                      Permanently remove this building and its units
                    </p>
                  </div>
                  <Trash2 className="h-4 w-4 text-red-700" />
                </button>
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

      {showDelete && q.data?.property && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleteMut.isPending && setShowDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-[0_24px_60px_-30px_rgb(15_39_44_/_0.35)]"
          >
            <div className="flex items-start gap-3 px-6 pb-4 pt-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[18px] font-extrabold leading-tight tracking-[-0.01em] text-foundation-700">
                  Delete this property?
                </h2>
                <p className="mt-1 text-[13px] leading-[1.55] text-ink-muted">
                  This permanently removes <strong className="text-foundation-700">{q.data.property.name}</strong> and all its units, leases, and history. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-6 pb-2">
              <label className="block">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Type <span className="font-mono normal-case tracking-normal text-foundation-700">{q.data.property.name}</span> to confirm
                </span>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  autoFocus
                  className="mt-1.5 w-full rounded-full border border-foundation-700/15 bg-surface px-4 py-2.5 text-[14px] text-foundation-700 outline-none transition focus:border-red-400"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-5">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleteMut.isPending}
                className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={!nameMatches || deleteMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteMut.isPending ? "Deleting…" : "Delete property"}
              </button>
            </div>
          </div>
        </div>
      )}
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
