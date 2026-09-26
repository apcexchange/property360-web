"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { NIGERIA_STATES, citiesForState } from "@/lib/nigeria-locations";

const BEDROOM_OPTIONS = [
  { value: "", label: "Any beds" },
  { value: "1", label: "1+ bed" },
  { value: "2", label: "2+ beds" },
  { value: "3", label: "3+ beds" },
  { value: "4", label: "4+ beds" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "500000", label: "Up to ₦500k" },
  { value: "1000000", label: "Up to ₦1M" },
  { value: "2500000", label: "Up to ₦2.5M" },
  { value: "5000000", label: "Up to ₦5M" },
  { value: "10000000", label: "Up to ₦10M" },
];

const STATE_OPTIONS = [
  { value: "", label: "Anywhere" },
  ...NIGERIA_STATES.map((state) => ({
    value: state.name,
    label: state.name === "FCT" ? "Federal Capital Territory (Abuja)" : state.name,
  })),
];

export function ListingFilters({
  defaultSearch = "",
  defaultBedrooms = "",
  defaultMaxPrice = "",
  defaultState = "",
  defaultCity = "",
  defaultPurpose = "",
  defaultPropertyType = "",
}: {
  defaultSearch?: string;
  defaultBedrooms?: string;
  defaultMaxPrice?: string;
  defaultState?: string;
  defaultCity?: string;
  defaultPurpose?: string;
  defaultPropertyType?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);
  const [bedrooms, setBedrooms] = useState(defaultBedrooms);
  const [maxPrice, setMaxPrice] = useState(defaultMaxPrice);
  const [state, setState] = useState(defaultState);
  const [city, setCity] = useState(defaultCity);
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [propertyType, setPropertyType] = useState(defaultPropertyType);

  function apply(next: {
    search?: string;
    bedrooms?: string;
    maxPrice?: string;
    state?: string;
    city?: string;
    purpose?: string;
    propertyType?: string;
  }) {
    const merged = new URLSearchParams(params?.toString() ?? "");
    const values = {
      search: next.search ?? search,
      bedrooms: next.bedrooms ?? bedrooms,
      maxPrice: next.maxPrice ?? maxPrice,
      state: next.state ?? state,
      city: next.city ?? city,
      purpose: next.purpose ?? purpose,
      propertyType: next.propertyType ?? propertyType,
    };
    for (const [k, v] of Object.entries(values)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    merged.delete("page");
    startTransition(() => {
      router.push(`/listings?${merged.toString()}`);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
      className="rounded-2xl border border-foundation-700/10 bg-surface p-4 shadow-card md:flex md:flex-wrap md:items-end md:gap-3"
    >
      <div className="md:flex-1">
        <label className="eyebrow block text-[10px]">Search</label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lekki, Yaba, GRA…"
            className="w-full rounded-full border border-foundation-700/10 bg-paper/60 py-2 pl-9 pr-4 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/30"
          />
        </div>
      </div>

      <Select
        label="Type"
        value={purpose}
        onChange={(v) => { setPurpose(v); apply({ purpose: v }); }}
        options={[{ value: "", label: "Any listing" }, { value: "rent", label: "For rent" }, { value: "sale", label: "For sale" }, { value: "shortlet", label: "Shortlet" }]}
      />
      <Select
        label="Property"
        value={propertyType}
        onChange={(v) => { setPropertyType(v); apply({ propertyType: v }); }}
        options={[{ value: "", label: "Any property" }, { value: "residential", label: "Homes" }, { value: "shop", label: "Shops" }, { value: "commercial", label: "Commercial" }, { value: "hostel", label: "Hostels" }, { value: "land", label: "Land / plots" }]}
      />
      <Select
        label="State"
        value={state}
        onChange={(v) => {
          setState(v);
          setCity("");
          apply({ state: v, city: "" });
        }}
        options={STATE_OPTIONS}
      />
      <Select
        label="City"
        value={city}
        onChange={(v) => { setCity(v); apply({ city: v }); }}
        options={[
          { value: "", label: state ? "Any city" : "Choose a state first" },
          ...citiesForState(state).map((name) => ({ value: name, label: name })),
        ]}
        disabled={!state}
      />
      <Select
        label="Beds"
        value={bedrooms}
        onChange={(v) => {
          setBedrooms(v);
          apply({ bedrooms: v });
        }}
        options={BEDROOM_OPTIONS}
      />
      <Select
        label="Price"
        value={maxPrice}
        onChange={(v) => {
          setMaxPrice(v);
          apply({ maxPrice: v });
        }}
        options={PRICE_OPTIONS}
      />

      <button
        type="submit"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 md:mt-0 md:w-auto"
      >
        Search
      </button>
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="mt-3 block md:mt-0">
      <span className="eyebrow block text-[10px]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-full border border-foundation-700/10 bg-paper/60 px-4 py-2 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/30 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
