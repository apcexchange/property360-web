"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  VideoIcon,
  X,
  Loader2,
} from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
} from "@/components/app/ui";
import {
  landlordApi,
  PropertyType,
  RentPeriod,
  UnitFees,
  PropertyImage,
} from "@/lib/landlord-api";
import {
  NIGERIA_STATE_NAMES,
  citiesForState,
} from "@/lib/nigeria-locations";

interface UnitDraft {
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  size?: number;
  rentAmount: number;
  rentPeriod: RentPeriod;
  defaultFees?: UnitFees;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "hostel", label: "Hostel" },
  { value: "shop", label: "Shop" },
  { value: "commercial", label: "Commercial" },
];

const AMENITIES = [
  "Parking",
  "Generator",
  "Borehole",
  "CCTV",
  "Security",
  "Pool",
  "Gym",
  "Wi-Fi",
  "Air Conditioning",
  "Fenced",
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [floors, setFloors] = useState<number | "">(1);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  // Cloudinary-hosted property media. Images are uploaded one-by-one via
  // POST /properties/upload-image which returns a permanent secure_url;
  // we store {url, publicId} client-side so the X button can remove the
  // right item without re-uploading. Videos follow the same pattern via
  // POST /properties/upload-video. Both arrays are sent in the create
  // payload — landlord can also add media post-create on the detail page.
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitDraft[]>([
    {
      unitNumber: "1",
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: 0,
      rentPeriod: "annually",
    },
  ]);
  // Per-unit fees disclosure. We render every unit's "Default fees" block
  // collapsed by default so the form stays scannable, then let landlords
  // expand only the units they want to set fees for.
  const [expandedFees, setExpandedFees] = useState<Set<number>>(new Set());
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickCount, setQuickCount] = useState<number | "">("");
  const [quickRent, setQuickRent] = useState<number | "">("");
  const [quickPeriod, setQuickPeriod] = useState<RentPeriod>("annually");
  // Quick-setup default fees: the landlord types each fee once and we
  // propagate the values to every generated unit (or, via "Apply to all
  // units", to the units already on the form). Saves a real chunk of
  // typing on multi-unit buildings where every flat carries the same
  // security deposit, caution fee, agent fee, etc.
  const [quickFees, setQuickFees] = useState<UnitFees>({});

  function quickFeesHaveValues(): boolean {
    return hasAnyFees(quickFees);
  }

  function applyQuickSetup() {
    const count = typeof quickCount === "number" ? Math.max(1, Math.floor(quickCount)) : 0;
    const rent = typeof quickRent === "number" ? Math.max(0, quickRent) : 0;
    if (!count) return;
    const sharedFees: UnitFees | undefined = quickFeesHaveValues()
      ? { ...quickFees }
      : undefined;
    const generated: UnitDraft[] = Array.from({ length: count }, (_, i) => ({
      unitNumber: `Flat ${i + 1}`,
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: rent,
      rentPeriod: quickPeriod,
      // Spread per-unit so mutations to one unit's fees don't leak
      // into the others.
      ...(sharedFees ? { defaultFees: { ...sharedFees } } : {}),
    }));
    setUnits(generated);
    setShowQuickSetup(false);
  }

  // For when the units are already on the form (e.g. landlord typed
  // them one-by-one and only thought of the fees afterwards). Stamps
  // every existing unit's defaultFees with the quick-setup values,
  // overwriting any prior fee entries on those units.
  function applyQuickFeesToAllUnits() {
    if (!quickFeesHaveValues()) return;
    setUnits((prev) =>
      prev.map((u) => ({ ...u, defaultFees: { ...quickFees } }))
    );
  }

  const create = useMutation({
    mutationFn: () =>
      landlordApi.createProperty({
        name: name.trim(),
        description: description.trim() || undefined,
        propertyType,
        floors: typeof floors === "number" && floors > 0 ? floors : 1,
        totalUnits: units.length,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim() || undefined,
        },
        amenities,
        ...(images.length > 0 ? { images } : {}),
        ...(videos.length > 0 ? { videos } : {}),
        units: units.map((u) => ({
          unitNumber: u.unitNumber,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          size: u.size,
          rentAmount: u.rentAmount,
          rentPeriod: u.rentPeriod,
          ...(hasAnyFees(u.defaultFees)
            ? { defaultFees: u.defaultFees }
            : {}),
        })),
      }),
    onSuccess: (p) => {
      router.push(`/app/properties/${p._id}`);
    },
  });

  const formError = (() => {
    if (!create.isError) return null;
    const err = create.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit =
    name.trim().length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    units.length > 0 &&
    units.every(
      (u) =>
        u.unitNumber.trim().length > 0 &&
        u.bedrooms >= 0 &&
        u.bathrooms >= 0 &&
        u.rentAmount > 0
    );

  return (
    <>
      <AppTopbar
        title="Add property"
        subtitle="Create a new building and its units"
        actions={
          <Link
            href="/app/properties"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Basic details
            </h2>
            <Field label="Property name">
              <Input
                value={name}
                onChange={(v) => setName(v)}
                placeholder="Maple Court Apartments"
              />
            </Field>
            <Field label="Description" optional>
              <Textarea
                value={description}
                onChange={(v) => setDescription(v)}
                placeholder="Anything tenants should know about the property."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select
                  value={propertyType}
                  onChange={(v) => setPropertyType(v as PropertyType)}
                  options={PROPERTY_TYPES.map((t) => ({
                    value: t.value,
                    label: t.label,
                  }))}
                />
              </Field>
              <Field label="Floors">
                <Input
                  type="number"
                  value={floors === "" ? "" : String(floors)}
                  onChange={(v) => {
                    if (v === "") return setFloors("");
                    const n = Number(v);
                    if (Number.isFinite(n) && n >= 0) setFloors(n);
                  }}
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Address
            </h2>
            <Field label="Street">
              <Input
                value={street}
                onChange={setStreet}
                placeholder="12 Akin Adesola Street"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="State">
                <Select
                  value={state}
                  onChange={(v) => {
                    setState(v);
                    // Reset city when state changes — city list depends on state.
                    setCity("");
                  }}
                  placeholder="Select state"
                  options={NIGERIA_STATE_NAMES.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                />
              </Field>
              <Field label="City">
                <Select
                  value={city}
                  onChange={setCity}
                  placeholder={state ? "Select city" : "Pick a state first"}
                  disabled={!state}
                  options={citiesForState(state).map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </Field>
              <Field label="Postal code" optional>
                <Input
                  value={postalCode}
                  onChange={setPostalCode}
                  placeholder="101241"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Units ({units.length})
              </h2>
              <button
                type="button"
                onClick={() =>
                  setUnits((prev) => [
                    ...prev,
                    {
                      unitNumber: String(prev.length + 1),
                      bedrooms: 1,
                      bathrooms: 1,
                      rentAmount: 0,
                      rentPeriod: "annually",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add unit
              </button>
            </div>

            {/* Quick setup — generate N units with the same rent in one shot.
                Best for hostels / mass-rental buildings; replaces the existing
                unit list. */}
            <div className="rounded-2xl border border-cryola-400/40 bg-cryola-50/60">
              <button
                type="button"
                onClick={() => setShowQuickSetup((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-foundation-700">
                  <Zap className="h-4 w-4 text-cryola-500" /> Quick setup
                  <span className="text-[11.5px] font-normal text-ink-muted">
                    — same rent for several units
                  </span>
                </span>
                {showQuickSetup ? (
                  <ChevronUp className="h-4 w-4 text-ink-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink-muted" />
                )}
              </button>
              {showQuickSetup && (
                <div className="border-t border-cryola-400/30 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="How many flats/rooms?">
                      <Input
                        type="number"
                        value={quickCount === "" ? "" : String(quickCount)}
                        onChange={(v) => {
                          if (v === "") return setQuickCount("");
                          const n = Number(v);
                          if (Number.isFinite(n) && n >= 0) setQuickCount(n);
                        }}
                        placeholder="e.g. 12"
                      />
                    </Field>
                    <Field label="Rent each (NGN)">
                      <Input
                        type="text"
                        value={
                          quickRent === ""
                            ? ""
                            : quickRent.toLocaleString("en-NG")
                        }
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, "");
                          setQuickRent(digits === "" ? "" : Number(digits));
                        }}
                        placeholder="500,000"
                      />
                    </Field>
                    <Field label="Period">
                      <Select
                        value={quickPeriod}
                        onChange={(v) => setQuickPeriod(v as RentPeriod)}
                        options={[
                          { value: "monthly", label: "Per month" },
                          { value: "quarterly", label: "Per quarter" },
                          { value: "annually", label: "Per year" },
                        ]}
                      />
                    </Field>
                  </div>
                  <QuickDefaultFees
                    fees={quickFees}
                    onChange={(field, raw) => {
                      const digits = raw.replace(/[^0-9]/g, "");
                      setQuickFees((prev) => ({
                        ...prev,
                        [field]: digits === "" ? undefined : Number(digits),
                      }));
                    }}
                    onApplyToExisting={applyQuickFeesToAllUnits}
                    canApplyToExisting={
                      quickFeesHaveValues() && units.length > 0
                    }
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11.5px] text-ink-muted">
                      Replaces the list below. You can fine-tune individual
                      flats/rooms after.
                    </p>
                    <button
                      type="button"
                      onClick={applyQuickSetup}
                      disabled={!quickCount || typeof quickCount !== "number"}
                      className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12px] font-semibold text-paper transition hover:bg-foundation-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Generate {typeof quickCount === "number" ? quickCount : ""} flats/rooms
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {units.map((u, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-foundation-700/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Unit {idx + 1}
                    </p>
                    {units.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setUnits((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="rounded-full p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Unit number">
                      <Input
                        value={u.unitNumber}
                        onChange={(v) =>
                          updateUnit(setUnits, idx, { unitNumber: v })
                        }
                      />
                    </Field>
                    <Field label="Bedrooms">
                      <Input
                        type="number"
                        value={String(u.bedrooms)}
                        onChange={(v) =>
                          updateUnit(setUnits, idx, {
                            bedrooms: Math.max(0, Number(v) || 0),
                          })
                        }
                      />
                    </Field>
                    <Field label="Bathrooms">
                      <Input
                        type="number"
                        value={String(u.bathrooms)}
                        onChange={(v) =>
                          updateUnit(setUnits, idx, {
                            bathrooms: Math.max(0, Number(v) || 0),
                          })
                        }
                      />
                    </Field>
                    <Field label="Size (m²)" optional>
                      <Input
                        type="number"
                        value={u.size ? String(u.size) : ""}
                        onChange={(v) =>
                          updateUnit(setUnits, idx, {
                            size: v ? Number(v) : undefined,
                          })
                        }
                      />
                    </Field>
                    <Field label="Rent (NGN)">
                      <Input
                        type="text"
                        value={
                          u.rentAmount > 0
                            ? u.rentAmount.toLocaleString("en-NG")
                            : ""
                        }
                        onChange={(v) => {
                          const digits = v.replace(/[^0-9]/g, "");
                          updateUnit(setUnits, idx, {
                            rentAmount: digits === "" ? 0 : Number(digits),
                          });
                        }}
                        placeholder="500,000"
                      />
                    </Field>
                    <Field label="Period">
                      <Select
                        value={u.rentPeriod}
                        onChange={(v) =>
                          updateUnit(setUnits, idx, {
                            rentPeriod: v as RentPeriod,
                          })
                        }
                        options={[
                          { value: "annually", label: "Per year" },
                          { value: "monthly", label: "Per month" },
                          { value: "daily", label: "Per day" },
                        ]}
                      />
                    </Field>
                  </div>

                  {/* Optional default fees — security deposit, caution
                      fee, agent fee, etc. Collapsed by default. */}
                  <UnitFeesPanel
                    unit={u}
                    expanded={expandedFees.has(idx)}
                    onToggle={() => {
                      setExpandedFees((prev) => {
                        const next = new Set(prev);
                        if (next.has(idx)) next.delete(idx);
                        else next.add(idx);
                        return next;
                      });
                    }}
                    onFeeChange={(field, raw) =>
                      updateUnitFee(setUnits, idx, field, raw)
                    }
                    onDescriptionChange={(raw) =>
                      updateUnitFeeDescription(setUnits, idx, raw)
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          <MediaCard
            images={images}
            videos={videos}
            uploadingImage={uploadingImage}
            uploadingVideo={uploadingVideo}
            error={mediaError}
            onAddImage={async (file) => {
              setMediaError(null);
              setUploadingImage(true);
              try {
                const { url, publicId } = await landlordApi.uploadPropertyImage(file);
                setImages((prev) => [
                  ...prev,
                  { url, publicId, isPrimary: prev.length === 0 },
                ]);
              } catch (err) {
                const ax = err as AxiosError<{ message?: string }>;
                setMediaError(
                  ax.response?.data?.message ??
                    (err as Error).message ??
                    "Image upload failed"
                );
              } finally {
                setUploadingImage(false);
              }
            }}
            onRemoveImage={(url) =>
              setImages((prev) => {
                const next = prev.filter((i) => i.url !== url);
                // Re-elect a primary if the one we removed was primary.
                if (next.length > 0 && !next.some((i) => i.isPrimary)) {
                  next[0] = { ...next[0], isPrimary: true };
                }
                return next;
              })
            }
            onAddVideo={async (file) => {
              setMediaError(null);
              setUploadingVideo(true);
              try {
                const { url } = await landlordApi.uploadPropertyVideo(file);
                setVideos((prev) => [...prev, url]);
              } catch (err) {
                const ax = err as AxiosError<{ message?: string }>;
                setMediaError(
                  ax.response?.data?.message ??
                    (err as Error).message ??
                    "Video upload failed"
                );
              } finally {
                setUploadingVideo(false);
              }
            }}
            onRemoveVideo={(url) =>
              setVideos((prev) => prev.filter((v) => v !== url))
            }
          />

          <Card className="space-y-3 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Amenities
            </h2>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const active = amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() =>
                      setAmenities((prev) =>
                        active ? prev.filter((x) => x !== a) : [...prev, a]
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "border-foundation-700 bg-foundation-700 text-paper"
                        : "border-foundation-700/15 bg-paper text-foundation-700 hover:bg-foundation-700/5"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/properties"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || create.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create property"}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}

function updateUnit(
  setter: React.Dispatch<React.SetStateAction<UnitDraft[]>>,
  idx: number,
  patch: Partial<UnitDraft>
) {
  setter((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
}

// Numeric fee fields on UnitFees. Used to detect whether the landlord
// actually entered any fee for the unit — if not we drop the object from
// the payload entirely so the backend doesn't persist a hollow record.
const FEE_FIELDS = [
  "securityDeposit",
  "cautionFee",
  "agentFee",
  "agreementFee",
  "legalFee",
  "serviceCharge",
  "otherFee",
] as const;

function hasAnyFees(fees: UnitFees | undefined): boolean {
  if (!fees) return false;
  return FEE_FIELDS.some((k) => {
    const v = fees[k];
    return typeof v === "number" && v > 0;
  });
}

// Helper for the per-unit fees panel: updates a single numeric fee on a
// unit. Empty string clears the field. Mirrors mobile's handleFeeChange.
function updateUnitFee(
  setter: React.Dispatch<React.SetStateAction<UnitDraft[]>>,
  idx: number,
  field: (typeof FEE_FIELDS)[number],
  raw: string
) {
  const digits = raw.replace(/[^0-9]/g, "");
  const amount = digits === "" ? 0 : Number(digits);
  setter((prev) =>
    prev.map((u, i) =>
      i === idx ? { ...u, defaultFees: { ...(u.defaultFees ?? {}), [field]: amount } } : u
    )
  );
}

function updateUnitFeeDescription(
  setter: React.Dispatch<React.SetStateAction<UnitDraft[]>>,
  idx: number,
  raw: string
) {
  setter((prev) =>
    prev.map((u, i) =>
      i === idx
        ? { ...u, defaultFees: { ...(u.defaultFees ?? {}), otherFeeDescription: raw } }
        : u
    )
  );
}

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
        {optional && (
          <span className="ml-1 normal-case tracking-normal text-[10px] text-ink-muted/70">
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 placeholder:text-ink-muted/60 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 placeholder:text-ink-muted/60 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}

// Property media card. Mirrors the visual weight of the Amenities card
// — landlord uploads photos one-at-a-time, sees a thumbnail grid, can
// remove or re-elect a primary image, and (optionally) attaches one or
// more walk-around videos. Uploads hit Cloudinary directly via the
// backend, so by the time the property is created the URLs are
// already permanent and the landlord can't accidentally lose them by
// reloading mid-form.
function MediaCard({
  images,
  videos,
  uploadingImage,
  uploadingVideo,
  error,
  onAddImage,
  onRemoveImage,
  onAddVideo,
  onRemoveVideo,
}: {
  images: PropertyImage[];
  videos: string[];
  uploadingImage: boolean;
  uploadingVideo: boolean;
  error: string | null;
  onAddImage: (file: File) => void;
  onRemoveImage: (url: string) => void;
  onAddVideo: (file: File) => void;
  onRemoveVideo: (url: string) => void;
}) {
  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Photos & video
        </h2>
        <p className="text-[11.5px] text-ink-muted">
          Optional · helps listings stand out
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <div>
        <p className="text-[12.5px] font-semibold text-foundation-700">Photos</p>
        <p className="mt-1 text-[11.5px] text-ink-muted">
          JPEG, PNG, HEIC, or WebP. Up to 10MB each. First photo is the cover.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-foundation-700/10 bg-foundation-700/[0.03]"
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
                onClick={() => onRemoveImage(img.url)}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-foundation-900/70 text-paper opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-foundation-700/20 bg-paper text-[11.5px] font-semibold text-ink-muted transition hover:border-foundation-700/40 hover:bg-foundation-700/[0.02]">
            {uploadingImage ? (
              <Loader2 className="h-5 w-5 animate-spin text-foundation-700" />
            ) : (
              <ImagePlus className="h-5 w-5 text-foundation-700" />
            )}
            <span>{uploadingImage ? "Uploading…" : "Add photo"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/heic,image/webp"
              className="sr-only"
              disabled={uploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddImage(file);
                // Reset so re-selecting the same file still fires onChange.
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div>
        <p className="text-[12.5px] font-semibold text-foundation-700">Videos</p>
        <p className="mt-1 text-[11.5px] text-ink-muted">
          MP4, MOV, or WebM. Up to 50MB each. Short walk-around clips work best.
        </p>
        <div className="mt-3 space-y-2">
          {videos.map((url) => (
            <div
              key={url}
              className="flex items-center gap-3 rounded-xl border border-foundation-700/10 bg-foundation-700/[0.02] p-2.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foundation-700/10 text-foundation-700">
                <VideoIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foundation-700">
                  {url.split("/").pop() ?? "Video"}
                </p>
                <p className="text-[11px] text-ink-muted">Uploaded</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveVideo(url)}
                aria-label="Remove video"
                className="rounded-full p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-foundation-700/25 bg-paper px-4 py-2 text-[12px] font-semibold text-foundation-700 transition hover:border-foundation-700/50 hover:bg-foundation-700/[0.02]">
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
              disabled={uploadingVideo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddVideo(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </Card>
  );
}

// Quick-setup fees block. Lives inside the Quick setup panel so the
// landlord can type each fee once and have it inherited by every
// generated unit (or pushed onto units that already exist).
function QuickDefaultFees({
  fees,
  onChange,
  onApplyToExisting,
  canApplyToExisting,
}: {
  fees: UnitFees;
  onChange: (field: Exclude<(typeof FEE_FIELDS)[number], "otherFee">, raw: string) => void;
  onApplyToExisting: () => void;
  canApplyToExisting: boolean;
}) {
  const PAIRS: Array<[
    { key: Exclude<(typeof FEE_FIELDS)[number], "otherFee">; label: string },
    { key: Exclude<(typeof FEE_FIELDS)[number], "otherFee">; label: string }
  ]> = [
    [
      { key: "securityDeposit", label: "Security deposit" },
      { key: "cautionFee", label: "Caution fee" },
    ],
    [
      { key: "agentFee", label: "Agent fee" },
      { key: "agreementFee", label: "Agreement fee" },
    ],
    [
      { key: "legalFee", label: "Legal fee" },
      { key: "serviceCharge", label: "Service charge" },
    ],
  ];

  return (
    <div className="mt-4 rounded-xl border border-cryola-400/30 bg-paper p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-foundation-700">
          Default fees for every flat/room
        </p>
        <p className="text-[11px] text-ink-muted">
          Optional · applied when adding a tenant
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {PAIRS.map(([a, b]) => (
          <div key={a.key} className="grid gap-3 sm:grid-cols-2">
            <Field label={a.label}>
              <Input
                type="text"
                value={
                  typeof fees[a.key] === "number" && (fees[a.key] as number) > 0
                    ? (fees[a.key] as number).toLocaleString("en-NG")
                    : ""
                }
                onChange={(v) => onChange(a.key, v)}
                placeholder="₦0"
              />
            </Field>
            <Field label={b.label}>
              <Input
                type="text"
                value={
                  typeof fees[b.key] === "number" && (fees[b.key] as number) > 0
                    ? (fees[b.key] as number).toLocaleString("en-NG")
                    : ""
                }
                onChange={(v) => onChange(b.key, v)}
                placeholder="₦0"
              />
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onApplyToExisting}
          disabled={!canApplyToExisting}
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-3.5 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply to all flats/rooms already on the form
        </button>
      </div>
    </div>
  );
}

function UnitFeesPanel({
  unit,
  expanded,
  onToggle,
  onFeeChange,
  onDescriptionChange,
}: {
  unit: UnitDraft;
  expanded: boolean;
  onToggle: () => void;
  onFeeChange: (field: (typeof FEE_FIELDS)[number], raw: string) => void;
  onDescriptionChange: (raw: string) => void;
}) {
  const fees = unit.defaultFees ?? {};
  const hasValues = hasAnyFees(unit.defaultFees);
  // Two columns of fee inputs, ordered to mirror mobile so the form
  // feels the same across platforms.
  const FEE_PAIRS: Array<[
    { key: (typeof FEE_FIELDS)[number]; label: string },
    { key: (typeof FEE_FIELDS)[number]; label: string }
  ]> = [
    [
      { key: "securityDeposit", label: "Security deposit" },
      { key: "cautionFee", label: "Caution fee" },
    ],
    [
      { key: "agentFee", label: "Agent fee" },
      { key: "agreementFee", label: "Agreement fee" },
    ],
    [
      { key: "legalFee", label: "Legal fee" },
      { key: "serviceCharge", label: "Service charge" },
    ],
  ];

  return (
    <div className="mt-4 rounded-2xl border border-foundation-700/10 bg-foundation-700/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-foundation-700">
          Default fees
          {hasValues && (
            <span className="rounded-full bg-cryola-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-foundation-700">
              set
            </span>
          )}
          <span className="text-[11.5px] font-normal text-ink-muted">
            — optional, applied when adding a tenant
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-foundation-700/10 px-4 py-4">
          <div className="space-y-3">
            {FEE_PAIRS.map(([a, b]) => (
              <div key={a.key} className="grid gap-3 sm:grid-cols-2">
                <Field label={a.label}>
                  <Input
                    type="text"
                    value={
                      typeof fees[a.key] === "number" && (fees[a.key] as number) > 0
                        ? (fees[a.key] as number).toLocaleString("en-NG")
                        : ""
                    }
                    onChange={(v) => onFeeChange(a.key, v)}
                    placeholder="₦0"
                  />
                </Field>
                <Field label={b.label}>
                  <Input
                    type="text"
                    value={
                      typeof fees[b.key] === "number" && (fees[b.key] as number) > 0
                        ? (fees[b.key] as number).toLocaleString("en-NG")
                        : ""
                    }
                    onChange={(v) => onFeeChange(b.key, v)}
                    placeholder="₦0"
                  />
                </Field>
              </div>
            ))}
            <Field label="Other fee">
              <Input
                type="text"
                value={
                  typeof fees.otherFee === "number" && fees.otherFee > 0
                    ? fees.otherFee.toLocaleString("en-NG")
                    : ""
                }
                onChange={(v) => onFeeChange("otherFee", v)}
                placeholder="₦0"
              />
            </Field>
            {typeof fees.otherFee === "number" && fees.otherFee > 0 && (
              <Field label="Other fee description">
                <Input
                  type="text"
                  value={fees.otherFeeDescription ?? ""}
                  onChange={onDescriptionChange}
                  placeholder="What's this fee for?"
                />
              </Field>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
