"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { Card, ErrorBox, PageContainer } from "@/components/app/ui";
import { landlordApi, PropertyImage, PropertyType, RentPeriod } from "@/lib/landlord-api";

const PROPERTY_TYPES: Array<{ value: PropertyType; label: string }> = [
  { value: "residential", label: "Residential" },
  { value: "hostel", label: "Hostel" },
  { value: "shop", label: "Shop" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land / plot" },
];

export default function NewMarketplacePropertyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [listingPurpose, setListingPurpose] = useState<"rent" | "sale" | "shortlet">("rent");
  const [unitNumber, setUnitNumber] = useState("1");
  const [rentAmount, setRentAmount] = useState("");
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>("annually");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [description, setDescription] = useState("");
  const [authorised, setAuthorised] = useState(false);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const publish = useMutation({
    mutationFn: async () => {
      const created = await landlordApi.createMarketplaceProperty({
        name: name.trim(), description: description.trim() || undefined,
        address: { street: street.trim(), city: city.trim(), state: state.trim() }, propertyType, images,
        hasOwnerAuthority: true,
        units: [{ unitNumber: unitNumber.trim(), rentAmount: Number(rentAmount), rentPeriod,
          bedrooms: Number(bedrooms), bathrooms: Number(bathrooms) }],
      });
      await landlordApi.listUnit(created.unitId, { visibility: "public", listingPurpose });
    },
    onSuccess: () => router.replace("/app/marketplace"),
  });
  const error = publish.isError
    ? ((publish.error as AxiosError<{ message?: string }>).response?.data?.message ?? (publish.error as Error).message)
    : null;

  return <>
    <AppTopbar title="List a client property" subtitle="Free standard marketplace listing" actions={
      <Link href="/app/marketplace" className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700"><ArrowLeft className="h-4 w-4" /> Back</Link>
    } />
    <PageContainer>
      <form className="mx-auto max-w-2xl space-y-6" onSubmit={(event) => { event.preventDefault(); if (authorised) publish.mutate(); }}>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Property name"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cedar Court" /></Field>
          <Field label="Property type"><select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)}>{PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
          <Field label="Listing type"><select value={listingPurpose} onChange={(e) => setListingPurpose(e.target.value as "rent" | "sale" | "shortlet")}><option value="rent">For rent</option><option value="sale">For sale</option><option value="shortlet">Shortlet</option></select></Field>
          <Field label="Street address"><input required value={street} onChange={(e) => setStreet(e.target.value)} /></Field>
          <Field label="City"><input required value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="State"><input required value={state} onChange={(e) => setState(e.target.value)} /></Field>
          <Field label="Unit / flat number"><input required value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} /></Field>
        </Card>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label={listingPurpose === "sale" ? "Asking price (₦)" : listingPurpose === "shortlet" ? "Nightly price (₦)" : "Rent (₦)"}><input required min="1" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} /></Field>
          <Field label="Rent period"><select value={rentPeriod} onChange={(e) => setRentPeriod(e.target.value as RentPeriod)}>{["annually", "quarterly", "monthly", "daily"].map((period) => <option key={period} value={period}>{period}</option>)}</select></Field>
          <Field label="Bedrooms"><input min="0" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
          <Field label="Bathrooms"><input min="0" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should prospective tenants know?" /></Field></div>
        </Card>
        <Card className="space-y-3 p-5"><p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Photos (optional)</p><input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple disabled={uploadingPhotos} onChange={async (event) => { const files = Array.from(event.target.files ?? []).slice(0, 10 - images.length); if (!files.length) return; setUploadingPhotos(true); try { const uploaded = await Promise.all(files.map((file) => landlordApi.uploadPropertyImage(file))); setImages((current) => [...current, ...uploaded.map((image, index) => ({ ...image, isPrimary: current.length + index === 0 }))]); } finally { setUploadingPhotos(false); event.target.value = ""; } }} className="block w-full text-[13px] text-ink-muted" /><p className="text-[12px] text-ink-muted">Up to 10 photos, 5 MB each. {uploadingPhotos ? "Uploading…" : images.length ? `${images.length} uploaded` : ""}</p></Card>
        <Card className="p-5"><label className="flex gap-3 text-[13px] leading-5 text-ink-muted"><input required type="checkbox" checked={authorised} onChange={(e) => setAuthorised(e.target.checked)} className="mt-1" /><span>I confirm I am the owner or have the owner&apos;s authority to advertise this property. False or duplicate listings may be removed.</span></label></Card>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-3"><Link href="/app/marketplace" className="rounded-full border border-foundation-700/15 px-5 py-2.5 text-[13px] font-semibold text-foundation-700">Cancel</Link><button type="submit" disabled={publish.isPending || !authorised} className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper disabled:opacity-50">{publish.isPending ? "Publishing…" : "Publish free listing"}</button></div>
      </form>
    </PageContainer>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}<span className="mt-1.5 block normal-case tracking-normal [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-foundation-700/15 [&_input]:bg-paper [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-[14px] [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-foundation-700/15 [&_select]:bg-paper [&_select]:px-3.5 [&_select]:py-2.5 [&_select]:text-[14px] [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-foundation-700/15 [&_textarea]:bg-paper [&_textarea]:px-3.5 [&_textarea]:py-2.5 [&_textarea]:text-[14px]">{children}</span></label>;
}
