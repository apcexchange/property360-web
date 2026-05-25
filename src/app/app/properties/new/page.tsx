"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Zap, ChevronUp, ChevronDown } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
} from "@/components/app/ui";
import { landlordApi, PropertyType, RentPeriod } from "@/lib/landlord-api";
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
}

// Display labels are decoupled from the stored enum value. We keep
// `apartment` on the wire so existing properties don't need a backfill;
// landlords just see it as "Residential" in the picker.
const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Residential" },
  { value: "house", label: "House" },
  { value: "bungalow", label: "Bungalow" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
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
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [floors, setFloors] = useState<number | "">(1);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [units, setUnits] = useState<UnitDraft[]>([
    {
      unitNumber: "1",
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: 0,
      rentPeriod: "annually",
    },
  ]);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickCount, setQuickCount] = useState<number | "">("");
  const [quickRent, setQuickRent] = useState<number | "">("");
  const [quickPeriod, setQuickPeriod] = useState<RentPeriod>("annually");

  function applyQuickSetup() {
    const count = typeof quickCount === "number" ? Math.max(1, Math.floor(quickCount)) : 0;
    const rent = typeof quickRent === "number" ? Math.max(0, quickRent) : 0;
    if (!count) return;
    const generated: UnitDraft[] = Array.from({ length: count }, (_, i) => ({
      unitNumber: `Flat ${i + 1}`,
      bedrooms: 1,
      bathrooms: 1,
      rentAmount: rent,
      rentPeriod: quickPeriod,
    }));
    setUnits(generated);
    setShowQuickSetup(false);
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
        units: units.map((u) => ({
          unitNumber: u.unitNumber,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          size: u.size,
          rentAmount: u.rentAmount,
          rentPeriod: u.rentPeriod,
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
                    <Field label="How many units?">
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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11.5px] text-ink-muted">
                      Replaces the unit list below. You can fine-tune individual
                      units after.
                    </p>
                    <button
                      type="button"
                      onClick={applyQuickSetup}
                      disabled={!quickCount || typeof quickCount !== "number"}
                      className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12px] font-semibold text-paper transition hover:bg-foundation-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Generate {typeof quickCount === "number" ? quickCount : ""} units
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
                </div>
              ))}
            </div>
          </Card>

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
