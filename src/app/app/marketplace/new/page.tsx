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
  { value: "hotel", label: "Hotel / guesthouse" },
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
  const [landSize, setLandSize] = useState("");
  const [landUnit, setLandUnit] = useState<"sqm" | "plot" | "acre">("plot");
  const [titleDocument, setTitleDocument] = useState("");
  const [minimumStayNights, setMinimumStayNights] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [serviceCharge, setServiceCharge] = useState("");
  const [parkingSpaces, setParkingSpaces] = useState("");
  const [powerBackup, setPowerBackup] = useState(false);
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const publish = useMutation({
    mutationFn: async () => {
      const created = await landlordApi.createMarketplaceProperty({
        name: name.trim(), description: description.trim() || undefined,
        address: { street: street.trim(), city: city.trim(), state: state.trim() }, propertyType, images,
        hotelProfile: propertyType === "hotel" ? { checkInTime, checkOutTime, cancellationPolicy: cancellationPolicy.trim() || undefined, contactPhone: contactPhone.trim() || undefined } : undefined,
        hasOwnerAuthority: true,
        units: [{ unitNumber: unitNumber.trim(), rentAmount: Number(rentAmount), rentPeriod,
          bedrooms: Number(bedrooms), bathrooms: Number(bathrooms) }],
      });
      await landlordApi.listUnit(created.unitId, { visibility: "public", listingPurpose: propertyType === "hotel" ? "shortlet" : listingPurpose, listingDetails: propertyType === "land" ? { landSize: Number(landSize) || undefined, landUnit, titleDocument: titleDocument.trim() || undefined } : (propertyType === "hotel" || listingPurpose === "shortlet") ? { minimumStayNights: Number(minimumStayNights) || undefined, maxGuests: propertyType === "hotel" ? Number(maxGuests) || 2 : undefined, serviceCharge: Number(serviceCharge) || undefined } : propertyType === "shop" || propertyType === "commercial" ? { parkingSpaces: Number(parkingSpaces) || undefined, powerBackup, serviceCharge: Number(serviceCharge) || undefined } : undefined });
      return created;
    },
    onSuccess: (created) => router.replace(propertyType === "hotel" ? `/app/hotels/${created.property._id}` : "/app/marketplace"),
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-[13px] font-semibold text-emerald-800">Standard listings are free</p>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-900/75">Publish a home, shortlet, shop, commercial space or plot. Your listing is reviewed before it appears publicly; Property360 does not charge rent commission.</p>
        </div>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Property name"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cedar Court" /></Field>
          <Field label="Property type"><select value={propertyType} onChange={(e) => { const next = e.target.value as PropertyType; setPropertyType(next); if (next === "hotel") { setListingPurpose("shortlet"); setRentPeriod("daily"); } }}>{PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
          <Field label="Listing type"><select value={propertyType === "hotel" ? "shortlet" : listingPurpose} disabled={propertyType === "hotel"} onChange={(e) => setListingPurpose(e.target.value as "rent" | "sale" | "shortlet")}><option value="rent">For rent</option><option value="sale">For sale</option><option value="shortlet">Shortlet</option></select></Field>
          <Field label="Street address"><input required value={street} onChange={(e) => setStreet(e.target.value)} /></Field>
          <Field label="City"><input required value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label="State"><input required value={state} onChange={(e) => setState(e.target.value)} /></Field>
          <Field label="Unit / flat number"><input required value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} /></Field>
        </Card>
        {propertyType === "land" && <Card className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Land size"><input type="number" min="0" value={landSize} onChange={(e) => setLandSize(e.target.value)} placeholder="e.g. 600" /></Field><Field label="Size unit"><select value={landUnit} onChange={(e) => setLandUnit(e.target.value as typeof landUnit)}><option value="plot">Plot</option><option value="sqm">Square metres</option><option value="acre">Acre</option></select></Field><div className="sm:col-span-2"><Field label="Title / document"><input value={titleDocument} onChange={(e) => setTitleDocument(e.target.value)} placeholder="e.g. C of O, Deed of Assignment" /></Field></div></Card>}
        {(listingPurpose === "shortlet" || propertyType === "hotel") && <Card className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Minimum stay (nights)"><input type="number" min="1" value={minimumStayNights} onChange={(e) => setMinimumStayNights(e.target.value)} /></Field>{propertyType === "hotel" && <Field label="Maximum guests for this room"><input required type="number" min="1" max="20" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} /></Field>}<Field label="Service charge (₦)"><input type="number" min="0" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} /></Field></Card>}
        {propertyType === "hotel" && <Card className="grid gap-4 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-[13px] font-semibold text-foundation-700">Hotel storefront details</p><p className="mt-1 text-[12px] text-ink-muted">These details appear on your public hotel page. List each room separately to build your inventory.</p></div><Field label="Check-in time"><input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} /></Field><Field label="Check-out time"><input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} /></Field><Field label="Booking contact phone"><input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 0800 000 0000" /></Field><div className="sm:col-span-2"><Field label="Cancellation policy"><textarea rows={3} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} placeholder="e.g. Free cancellation up to 24 hours before check-in." /></Field></div></Card>}
        {(propertyType === "shop" || propertyType === "commercial") && <Card className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Parking spaces"><input type="number" min="0" value={parkingSpaces} onChange={(e) => setParkingSpaces(e.target.value)} /></Field><Field label="Service charge (₦)"><input type="number" min="0" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} /></Field><label className="sm:col-span-2 flex gap-2 text-[13px] text-ink-muted"><input type="checkbox" checked={powerBackup} onChange={(e) => setPowerBackup(e.target.checked)} />Power backup available</label></Card>}
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label={listingPurpose === "sale" ? "Asking price (₦)" : listingPurpose === "shortlet" ? "Nightly price (₦)" : "Rent (₦)"}><input required min="1" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} /></Field>
          <Field label="Rent period"><select value={rentPeriod} onChange={(e) => setRentPeriod(e.target.value as RentPeriod)}>{["annually", "quarterly", "monthly", "daily"].map((period) => <option key={period} value={period}>{period}</option>)}</select></Field>
          <Field label="Bedrooms"><input min="0" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></Field>
          <Field label="Bathrooms"><input min="0" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should prospective tenants know?" /></Field></div>
        </Card>
        <Card className="space-y-3 p-5"><p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Photos</p><input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple disabled={uploadingPhotos} onChange={async (event) => { const files = Array.from(event.target.files ?? []).slice(0, 10 - images.length); if (!files.length) return; setUploadingPhotos(true); setPhotoError(""); try { const uploaded = await Promise.all(files.map((file) => landlordApi.uploadPropertyImage(file))); setImages((current) => [...current, ...uploaded.map((image, index) => ({ ...image, isPrimary: current.length + index === 0 }))]); } catch { setPhotoError("Couldn’t upload one or more photos. Check the file type and 5 MB limit, then try again."); } finally { setUploadingPhotos(false); event.target.value = ""; } }} className="block w-full text-[13px] text-ink-muted" />{images.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{images.map((image) => <div key={image.url} className="relative aspect-square overflow-hidden rounded-lg border border-foundation-700/10"><img src={image.url} alt="Property upload" className="h-full w-full object-cover" /><button type="button" onClick={() => setImages((current) => current.filter((item) => item.url !== image.url))} className="absolute right-1 top-1 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Remove</button></div>)}</div>}{photoError && <p className="text-[12px] text-red-700">{photoError}</p>}<p className="text-[12px] text-ink-muted">A photo is required before an admin can approve your listing. Add up to 10 photos, 5 MB each. {uploadingPhotos ? "Uploading…" : images.length ? `${images.length} uploaded` : ""}</p></Card>
        <Card className="p-5"><label className="flex gap-3 text-[13px] leading-5 text-ink-muted"><input required type="checkbox" checked={authorised} onChange={(e) => setAuthorised(e.target.checked)} className="mt-1" /><span>I confirm I am the owner or have the owner&apos;s authority to advertise this property. False or duplicate listings may be removed.</span></label></Card>
        {error && <ErrorBox message={error} />}
        <div className="flex flex-wrap items-center justify-end gap-3"><p className="mr-auto text-[12px] text-ink-muted">{images.length === 0 ? "Add at least one photo to publish." : "Ready for review."}</p><Link href="/app/marketplace" className="rounded-full border border-foundation-700/15 px-5 py-2.5 text-[13px] font-semibold text-foundation-700">Cancel</Link><button type="submit" disabled={publish.isPending || !authorised || images.length === 0} className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper disabled:opacity-50">{publish.isPending ? "Publishing…" : "Publish free listing"}</button></div>
      </form>
    </PageContainer>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}<span className="mt-1.5 block normal-case tracking-normal [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-foundation-700/15 [&_input]:bg-paper [&_input]:px-3.5 [&_input]:py-2.5 [&_input]:text-[14px] [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-foundation-700/15 [&_select]:bg-paper [&_select]:px-3.5 [&_select]:py-2.5 [&_select]:text-[14px] [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-foundation-700/15 [&_textarea]:bg-paper [&_textarea]:px-3.5 [&_textarea]:py-2.5 [&_textarea]:text-[14px]">{children}</span></label>;
}
