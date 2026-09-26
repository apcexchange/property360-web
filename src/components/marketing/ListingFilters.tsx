"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { NIGERIA_STATE_NAMES, NIGERIA_STATES } from "@/lib/nigeria-locations";

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
  ...NIGERIA_STATE_NAMES.map((name) => ({ value: name, label: name })),
];

export function ListingFilters({
  defaultSearch = "",
  defaultBedrooms = "",
  defaultMaxPrice = "",
  defaultState = "",
  defaultPurpose = "",
  defaultCity = "",
  defaultPropertyType = "",
}: {
  defaultSearch?: string;
  defaultBedrooms?: string;
  defaultMaxPrice?: string;
  defaultState?: string;
  defaultPurpose?: string;
  defaultCity?: string;
  defaultPropertyType?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);
  const [bedrooms, setBedrooms] = useState(defaultBedrooms);
  const [maxPrice, setMaxPrice] = useState(defaultMaxPrice);
  const [state, setState] = useState(defaultState);
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [city, setCity] = useState(defaultCity);
  const [propertyType, setPropertyType] = useState(defaultPropertyType);
  const cityOptions = state ? (NIGERIA_STATES.find((item) => item.name === state)?.cities ?? []) : [];

  function apply(next: {
    search?: string;
    bedrooms?: string;
    maxPrice?: string;
    state?: string;
    purpose?: string;
    city?: string;
    propertyType?: string;
  }) {
    const merged = new URLSearchParams(params?.toString() ?? "");
    const values = {
      search: next.search ?? search,
      bedrooms: next.bedrooms ?? bedrooms,
      maxPrice: next.maxPrice ?? maxPrice,
      state: next.state ?? state,
      purpose: next.purpose ?? purpose,
      city: next.city ?? city,
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
      className="rounded-2xl border border-foundation-700/10 bg-surface p-4 shadow-card md:flex md:items-end md:gap-3"
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
        label="Looking for"
        value={purpose}
        onChange={(v) => { setPurpose(v); apply({ purpose: v }); }}
        options={[{ value: "", label: "Any property" }, { value: "rent", label: "For rent" }, { value: "sale", label: "For sale" }, { value: "shortlet", label: "Shortlet" }]}
      />
      <Select
        label="Property"
        value={propertyType}
        onChange={(v) => { setPropertyType(v); apply({ propertyType: v }); }}
        options={[{ value: "", label: "Any type" }, { value: "residential", label: "Home / apartment" }, { value: "hostel", label: "Hostel" }, { value: "land", label: "Land / plot" }, { value: "shop", label: "Shop" }, { value: "commercial", label: "Commercial" }, { value: "hotel", label: "Hotel / guesthouse" }]}
      />
      <Select
        label="State"
        value={state}
        onChange={(v) => {
          setState(v); setCity("");
          apply({ state: v, city: "" });
        }}
        options={STATE_OPTIONS}
      />
      <Select
        label="City"
        value={city}
        onChange={(v) => { setCity(v); apply({ city: v }); }}
        options={[{ value: "", label: state ? "Any city" : "Choose a state" }, ...cityOptions.map((name) => ({ value: name, label: name }))]}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="mt-3 block md:mt-0">
      <span className="eyebrow block text-[10px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-full border border-foundation-700/10 bg-paper/60 px-4 py-2 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/30 md:w-auto"
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
