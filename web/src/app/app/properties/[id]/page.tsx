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
  ImagePlus,
  Video as VideoIcon,
  X,
  Loader2,
  Plus,
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
import { landlordApi, Unit, Property, PropertyImage } from "@/lib/landlord-api";
import { DEFAULT_PROPERTY_IMAGE } from "@/lib/propertyImage";
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

  const nameMatches =
    !!q.data?.property &&
    deleteConfirm.trim().toLowerCase() === q.data.property.name.trim().toLowerCase();

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

// Pull a readable filename out of a Cloudinary (or other CDN) URL —
// defensive against empty strings / non-string values that defeated
// the original `url.split('/').pop()` and crashed the tree on
// production. Always returns a printable string.
function videoFilename(url: unknown): string {
  if (typeof url !== "string" || url.length === 0) return "Video";
  const stripped = url.split(/[?#]/, 1)[0];
  const last = stripped.split("/").pop();
  return last && last.length > 0 ? last : "Video";
}

/**
 * Editable media gallery for an existing property. Lets the landlord
 * add/remove photos and videos after creation — the only feature that
 * was missing from the create flow on the detail page until now. Each
 * upload goes straight to Cloudinary; we then PATCH the property's
 * images/videos arrays in one round-trip so the server is always in
 * sync with what the landlord sees on screen.
 *
 * Renders the bundled brand placeholder when no photo has been added
 * yet, so the detail page never shows an empty hero block.
 */
function PropertyMediaCard({
  property,
  propertyId,
}: {
  property: Property;
  propertyId: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingPatch, setSavingPatch] = useState(false);

  // Guard against null / "" entries the server might have written from
  // older code paths or partial uploads — `url.split(...)` etc. need a
  // real string. Defensive coercion here is cheaper than scattering
  // null-checks through every render branch.
  const images: PropertyImage[] = (property.images ?? []).filter(
    (i): i is PropertyImage =>
      !!i && typeof i.url === "string" && i.url.length > 0
  );
  const videos: string[] = (property.videos ?? []).filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  const hasMedia = images.length > 0 || videos.length > 0;

  // Persist whichever array changed. Backend's PUT /properties/:id
  // wants flat string arrays for images, so unwrap the {url} shape.
  async function persist(next: {
    images?: PropertyImage[];
    videos?: string[];
  }) {
    setSavingPatch(true);
    try {
      await landlordApi.updateProperty(propertyId, {
        ...(next.images
          ? { images: next.images.map((i) => i.url) }
          : {}),
        ...(next.videos ? { videos: next.videos } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["properties", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't save media")
      );
    } finally {
      setSavingPatch(false);
    }
  }

  async function addImage(file: File) {
    setUploadingImage(true);
    try {
      const { url, publicId } = await landlordApi.uploadPropertyImage(file);
      const next = [
        ...images,
        { url, publicId, isPrimary: images.length === 0 },
      ];
      await persist({ images: next });
      toast.success("Photo added");
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Upload failed")
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function removeImage(url: string) {
    let next = images.filter((i) => i.url !== url);
    // Re-elect a primary if the one we removed was primary.
    if (next.length > 0 && !next.some((i) => i.isPrimary)) {
      next = next.map((i, idx) => (idx === 0 ? { ...i, isPrimary: true } : i));
    }
    await persist({ images: next });
    toast.success("Photo removed");
  }

  async function addVideo(file: File) {
    setUploadingVideo(true);
    try {
      const { url } = await landlordApi.uploadPropertyVideo(file);
      await persist({ videos: [...videos, url] });
      toast.success("Video added");
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Upload failed")
      );
    } finally {
      setUploadingVideo(false);
    }
  }

  async function removeVideo(url: string) {
    await persist({ videos: videos.filter((v) => v !== url) });
    toast.success("Video removed");
  }

  return (
    <Card className="space-y-5 overflow-hidden p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Photos &amp; video
        </h2>
        {savingPatch && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
      </div>

      {!hasMedia ? (
        // Brand placeholder so the detail page never looks empty. Add
        // first photo via the dashed tile below.
        <div className="grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-2xl bg-foundation-700/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_PROPERTY_IMAGE}
            alt="No photos added yet"
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {images.slice(0, 8).map((img, i) => (
            <div
              key={img.url}
              className={`group relative overflow-hidden rounded-xl bg-foundation-700/5 ${
                i === 0
                  ? "col-span-2 row-span-2 aspect-square sm:col-span-2 sm:row-span-2"
                  : "aspect-square"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
              {img.isPrimary && (
                <span className="absolute left-2 top-2 rounded-full bg-cryola-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-foundation-700">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(img.url)}
                aria-label="Remove photo"
                disabled={savingPatch}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-foundation-900/70 text-paper opacity-0 transition group-hover:opacity-100 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-foundation-700/25 bg-paper px-4 py-2.5 text-[12.5px] font-semibold text-foundation-700 transition hover:border-foundation-700/45 hover:bg-foundation-700/[0.03]">
          {uploadingImage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          <span>{uploadingImage ? "Uploading photo…" : "Add photo"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp"
            className="sr-only"
            disabled={uploadingImage || savingPatch}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addImage(file);
              e.target.value = "";
            }}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-foundation-700/25 bg-paper px-4 py-2.5 text-[12.5px] font-semibold text-foundation-700 transition hover:border-foundation-700/45 hover:bg-foundation-700/[0.03]">
          {uploadingVideo ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>{uploadingVideo ? "Uploading video…" : "Add video"}</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="sr-only"
            disabled={uploadingVideo || savingPatch}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addVideo(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {videos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Videos
          </p>
          {videos.map((url) => (
            <div
              key={url}
              className="flex items-center gap-3 rounded-xl border border-foundation-700/10 bg-foundation-700/[0.02] p-2.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foundation-700/10 text-foundation-700">
                <VideoIcon className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foundation-700">
                {videoFilename(url)}
              </p>
              <button
                type="button"
                onClick={() => removeVideo(url)}
                aria-label="Remove video"
                disabled={savingPatch}
                className="rounded-full p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
