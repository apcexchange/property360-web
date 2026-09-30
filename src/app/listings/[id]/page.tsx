import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, Bath, Square, MapPin, Calendar, Check, BadgeCheck, CreditCard, Flag, ShieldCheck, UserRound } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { ReserveListingCTA } from "@/components/marketing/ReserveListingCTA";
import { HotelBookingForm } from "@/components/marketing/HotelBookingForm";
import { ReportListingButton } from "@/components/marketing/ReportListingButton";
import { ContactOwnerButton } from "@/components/marketing/ContactOwnerButton";
import { StartPurchasePlanCTA } from "@/components/marketing/StartPurchasePlanCTA";
import { ListingCard } from "@/components/marketing/ListingCard";
import { ListingGallery } from "@/components/marketing/ListingGallery";
import { ListingEnquiryComposer } from "@/components/marketing/ListingEnquiryComposer";
import {
  getListing,
  getListings,
  formatNaira,
  formatNairaFull,
  listingTitle,
  locationLabel,
  isLandlordVerified,
} from "@/lib/listings-api";
import { slugifyLocation, resolveLocationSlug } from "@/lib/nigeria-locations";

export const revalidate = 60;

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id).catch(() => null);
  if (!listing) return { title: "Listing not found" };

  const title = `${listingTitle(listing)} · ${locationLabel(listing.property?.address)}`;
  const purpose = listing.listingPurpose ?? "rent";
  const priceLabel = purpose === "sale" ? "for sale at" : purpose === "shortlet" ? "shortlet from" : "for rent at";
  const cadence = purpose === "sale" ? "" : purpose === "shortlet" ? "/night" : "/year";
  const rawDescription =
    listing.listingDescription?.trim() ||
    listing.property?.description?.trim() ||
    `${listing.bedrooms ?? "—"}-bedroom ${listing.property?.propertyType ?? "property"} ${priceLabel} ${formatNaira(listing.rentAmount)}${cadence} in ${locationLabel(listing.property?.address)}.`;
  const description = rawDescription.replace(/\s+/g, " ").slice(0, 160);
  const socialImage = `/listings/${id}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title,
      description,
      url: `https://property360.africa/listings/${id}`,
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `${listingTitle(listing)} on Property360`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const listing = await getListing(id).catch(() => null);
  if (!listing) notFound();

  const images = listing.property?.images ?? [];
  const similar = await getListings({
    state: listing.property?.address?.state,
    purpose: listing.listingPurpose,
    bedrooms: listing.bedrooms,
    limit: 5,
  }).then((result) => result.listings.filter((item) => item.id !== listing.id).slice(0, 3)).catch(() => []);
  const amenities = listing.property?.amenities ?? [];
  const listingDescription =
    listing.listingDescription?.trim() || listing.property?.description?.trim() || "";
  const fees = listing.defaultFees ?? {};
  const details = listing.listingDetails ?? {};
  const salePlan = details.saleInstallmentPlan?.enabled ? details.saleInstallmentPlan : null;
  const depositAmount = salePlan ? (listing.rentAmount * salePlan.depositPercentage) / 100 : 0;
  const installmentAmount = salePlan ? (listing.rentAmount * salePlan.installmentPercentage) / 100 : 0;
  const hasDiscount =
    listing.originalPrice != null && listing.originalPrice > listing.rentAmount;
  const reserved = listing.listingStatus === "reserved";
  const purpose = listing.listingPurpose ?? "rent";
  const isLand = listing.property?.propertyType === "land";
  const listingKind = isLand
    ? "land"
    : listing.property?.propertyType === "house" || listing.property?.propertyType === "bungalow"
      ? "house"
      : "property";
  const priceSuffix = purpose === "sale" ? "" : purpose === "shortlet" ? "/night" : "/year";
  const priceLabel = purpose === "sale" ? "Asking price" : purpose === "shortlet" ? "Nightly rate" : "Annual rent";
  const verified = isLandlordVerified(listing);
  const owner = listing.property?.owner;
  const publisherName = owner?.firstName
    ? `${owner.firstName}${owner.lastName ? ` ${owner.lastName.slice(0, 1)}.` : ""}`
    : "Property360 publisher";
  const publisherType = owner?.role === "agent" ? "Independent agent" : "Property owner";
  const availabilityConfirmedAt = listing.listingLastConfirmedAt
    ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(listing.listingLastConfirmedAt),
      )
    : null;
  const contactLabel =
    purpose === "sale" ? "Request details" : owner?.role === "agent" ? "Message the agent" : "Message the owner";

  // Link the location label to its SEO landing page (prefer state, then city)
  // when the place is one we recognise, to tighten the internal link cluster.
  const addr = listing.property?.address;
  const stateSlug = addr?.state ? slugifyLocation(addr.state) : null;
  const citySlug = addr?.city ? slugifyLocation(addr.city) : null;
  const locationHref =
    (stateSlug && resolveLocationSlug(stateSlug) && `/listings/in/${stateSlug}`) ||
    (citySlug && resolveLocationSlug(citySlug) && `/listings/in/${citySlug}`) ||
    null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: listingTitle(listing),
    description: listingDescription,
    numberOfRooms: listing.bedrooms,
    floorSize: listing.size
      ? { "@type": "QuantitativeValue", value: listing.size, unitText: "SQM" }
      : undefined,
    image: images,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.property?.address?.street,
      addressLocality: listing.property?.address?.city,
      addressRegion: listing.property?.address?.state,
      addressCountry: "NG",
    },
    offers: {
      "@type": "Offer",
      price: listing.rentAmount,
      priceCurrency: "NGN",
      availability: reserved
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-paper pb-24 text-foundation-700 lg:pb-0">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1 text-[13px] text-ink-muted transition hover:text-foundation-700"
        >
          ← All listings
        </Link>

        <div className="mt-4 flex items-start justify-between gap-6">
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
            {listingTitle(listing)}
          </h1>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
          <MapPin className="h-3.5 w-3.5" />
          {locationHref ? (
            <Link
              href={locationHref}
              className="underline-offset-2 transition hover:text-foundation-700 hover:underline"
            >
              {locationLabel(addr)}
            </Link>
          ) : (
            locationLabel(addr)
          )}
          {addr?.street && (
            <span className="text-ink-faint"> · {addr.street}</span>
          )}
        </p>

        {verified && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified landlord
          </p>
        )}
        {availabilityConfirmedAt && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Availability confirmed {availabilityConfirmedAt}
          </p>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-6">
          <ListingGallery
            images={images}
            alt={listingTitle(listing)}
            unitId={listing.id}
          />
          <aside className="mt-6 hidden rounded-[1.5rem] border border-foundation-700/10 bg-surface p-5 shadow-card lg:block lg:mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {reserved ? "Currently reserved" : "Available now"}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-display text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700">
                {formatNaira(listing.rentAmount)}
                {priceSuffix && (
                  <span className="ml-1 text-[13px] font-medium text-ink-muted">
                    {priceSuffix}
                  </span>
                )}
              </p>
              {hasDiscount && (
                <span className="text-[14px] text-ink-muted line-through">
                  {formatNaira(listing.originalPrice!)}
                  {priceSuffix}
                </span>
              )}
            </div>
            {listing.isNegotiable && (
              <p className="mt-1 text-[12px] text-emerald-700">
                Price is negotiable
              </p>
            )}
            <div className="mt-5">
              <ListingEnquiryComposer
                unitId={listing.id}
                listingHref={`/listings/${listing.id}`}
                publisherName={publisherName}
                publisherType={publisherType}
                verified={verified}
                purpose={
                  purpose === "sale"
                    ? "sale"
                    : purpose === "shortlet"
                      ? "shortlet"
                      : "rent"
                }
              />
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
              Messages stay in Property360, so you have one clear record of the
              enquiry.
            </p>
          </aside>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13.5px] text-foundation-700">
              {!isLand && (
                <>
                  <Stat
                    icon={<BedDouble className="h-4 w-4" />}
                    label="Bedrooms"
                    value={listing.bedrooms ?? "—"}
                  />
                  <Stat
                    icon={<Bath className="h-4 w-4" />}
                    label="Bathrooms"
                    value={listing.bathrooms ?? "—"}
                  />
                </>
              )}
              {isLand && details.landSize != null && (
                <Stat
                  icon={<Square className="h-4 w-4" />}
                  label="Land size"
                  value={`${details.landSize} ${details.landUnit ?? "sqm"}`}
                />
              )}
              {listing.size ? (
                <Stat
                  icon={<Square className="h-4 w-4" />}
                  label="Size"
                  value={`${listing.size} sqm`}
                />
              ) : null}
              {listing.availableFrom ? (
                <Stat
                  icon={<Calendar className="h-4 w-4" />}
                  label="Available"
                  value={new Date(listing.availableFrom).toLocaleDateString(
                    "en-NG",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                />
              ) : null}
            </div>

            {listingDescription && (
              <Section title={`About this ${listingKind}`}>
                <p className="whitespace-pre-line text-[15px] leading-[1.65] text-ink-body">
                  {listingDescription}
                </p>
              </Section>
            )}

            {amenities.length > 0 && (
              <Section title="Amenities">
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] text-ink-body sm:grid-cols-3">
                  {amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <Check
                        className="h-3.5 w-3.5 text-foundation-700"
                        strokeWidth={2.5}
                      />
                      {a}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Move-in costs">
              <table className="w-full table-fixed text-[14px]">
                <tbody>
                  <Row
                    label={priceLabel}
                    value={formatNairaFull(listing.rentAmount)}
                    bold
                  />
                  {details.landSize != null && (
                    <Row
                      label="Land size"
                      value={`${details.landSize} ${details.landUnit ?? "sqm"}`}
                    />
                  )}
                  {details.titleDocument && (
                    <Row label="Title document" value={details.titleDocument} />
                  )}
                  {details.minimumStayNights != null && (
                    <Row
                      label="Minimum stay"
                      value={`${details.minimumStayNights} night${details.minimumStayNights === 1 ? "" : "s"}`}
                    />
                  )}
                  {details.serviceCharge != null &&
                    details.serviceCharge > 0 && (
                      <Row
                        label="Service charge"
                        value={formatNairaFull(details.serviceCharge)}
                      />
                    )}
                  {details.parkingSpaces != null && (
                    <Row
                      label="Parking"
                      value={`${details.parkingSpaces} space${details.parkingSpaces === 1 ? "" : "s"}`}
                    />
                  )}
                  {details.powerBackup && (
                    <Row label="Power backup" value="Available" />
                  )}
                  {fees.securityDeposit ? (
                    <Row
                      label="Security deposit"
                      value={formatNairaFull(fees.securityDeposit)}
                    />
                  ) : null}
                  {fees.cautionFee ? (
                    <Row
                      label="Caution fee"
                      value={formatNairaFull(fees.cautionFee)}
                    />
                  ) : null}
                  {fees.agentFee ? (
                    <Row
                      label="Agent fee"
                      value={formatNairaFull(fees.agentFee)}
                    />
                  ) : null}
                  {fees.agreementFee ? (
                    <Row
                      label="Agreement fee"
                      value={formatNairaFull(fees.agreementFee)}
                    />
                  ) : null}
                  {fees.legalFee ? (
                    <Row
                      label="Legal fee"
                      value={formatNairaFull(fees.legalFee)}
                    />
                  ) : null}
                  {fees.serviceCharge ? (
                    <Row
                      label="Service charge"
                      value={formatNairaFull(fees.serviceCharge)}
                    />
                  ) : null}
                  {listing.inspectionFeeEnabled && listing.inspectionFee ? (
                    <Row
                      label="Inspection fee"
                      value={formatNairaFull(listing.inspectionFee)}
                    />
                  ) : null}
                </tbody>
              </table>
              <p className="mt-3 text-[12px] text-ink-muted">
                Costs are set by the landlord and may be negotiable on
                inspection.
              </p>
            </Section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-foundation-700/10 bg-surface p-6 shadow-card">
              <p className="text-[12px] uppercase tracking-[0.16em] text-foundation-700">
                {reserved ? "Reserved" : "Available"}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="font-display text-[34px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700">
                  {formatNaira(listing.rentAmount)}
                  {priceSuffix && (
                    <span className="ml-1 text-[14px] font-medium text-ink-muted">
                      {priceSuffix}
                    </span>
                  )}
                </p>
                {hasDiscount && (
                  <span className="text-[16px] text-ink-muted line-through">
                    {formatNaira(listing.originalPrice!)}
                    {priceSuffix}
                  </span>
                )}
              </div>
              {listing.isNegotiable && (
                <p className="mt-1 text-[12px] text-foundation-700">
                  Negotiable
                </p>
              )}
              {purpose === "sale" && salePlan && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                    Instalment plan available
                  </p>
                  <p className="mt-2 text-[16px] font-bold text-foundation-700">
                    {salePlan.depositPercentage}% deposit ·{" "}
                    {formatNairaFull(depositAmount)}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                    Then {salePlan.installmentCount} {salePlan.frequency}{" "}
                    payments of {salePlan.installmentPercentage}% (
                    {formatNairaFull(installmentAmount)}). Allocation starts
                    after {salePlan.allocationPercentage}% is confirmed.
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3">
                {listing.property?.propertyType === "hotel" ? (
                  <>
                    <HotelBookingForm
                      unitId={listing.id}
                      nightlyRate={listing.rentAmount}
                      minimumStay={listing.listingDetails?.minimumStayNights}
                    />
                    <ContactOwnerButton
                      unitId={listing.id}
                      label={contactLabel}
                      variant="outline"
                    />
                  </>
                ) : purpose === "sale" ? (
                  <>
                    <div className="lg:hidden">
                      <ListingEnquiryComposer
                        unitId={listing.id}
                        listingHref={`/listings/${listing.id}`}
                        publisherName={publisherName}
                        publisherType={publisherType}
                        verified={verified}
                        purpose="sale"
                      />
                    </div>
                    {salePlan && (
                      <StartPurchasePlanCTA
                        unitId={listing.id}
                        listingHref={`/listings/${listing.id}`}
                      />
                    )}
                    <p className="rounded-xl bg-foundation-700/5 p-3 text-[13px] leading-relaxed text-ink-muted">
                      Request details through Property360 before arranging an
                      inspection.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="lg:hidden">
                      <ListingEnquiryComposer
                        unitId={listing.id}
                        listingHref={`/listings/${listing.id}`}
                        publisherName={publisherName}
                        publisherType={publisherType}
                        verified={verified}
                        purpose={purpose === "shortlet" ? "shortlet" : "rent"}
                      />
                    </div>
                    <p className="text-center text-[12px] leading-relaxed text-ink-muted">
                      Ask about inspection, price or availability. Replies
                      arrive in your Property360 messages.
                    </p>
                    <ReserveListingCTA
                      unitId={listing.id}
                      reserved={reserved}
                      listingHref={`/listings/${listing.id}`}
                      actionLabel="Request a viewing"
                    />
                  </>
                )}
                <ReportListingButton unitId={listing.id} />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                Prefer the mobile app? You can also reserve and chat from
                Property360 on iOS or Android:
              </p>
              <AppStoreButtons className="mt-3" />
            </div>

            <div className="mt-5 rounded-2xl border border-foundation-700/10 bg-paper-deep/60 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p className="font-semibold text-foundation-700">
                Before you enquire
              </p>
              <div className="mt-4 border-b border-foundation-700/10 pb-4">
                <div className="flex items-start gap-2.5">
                  <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-foundation-700" />
                  <p>
                    <span className="font-semibold text-foundation-700">
                      {publisherName}
                    </span>
                    <br />
                    {publisherType}
                    {verified ? " · identity verified" : ""}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {verified ? (
                  <li className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> This landlord&apos;s
                    identity is verified.
                  </li>
                ) : (
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foundation-700" />
                    Property360 reviews new marketplace listings before
                    publication.
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foundation-700" />
                  Use Property360 payments where available. Do not send money to
                  an unknown account.
                </li>
                <li className="flex items-start gap-2">
                  <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foundation-700" />
                  Report a listing if the information, price or availability
                  looks wrong.
                </li>
              </ul>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16 border-t border-foundation-700/10 pt-10">
            <p className="eyebrow">More to consider</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-foundation-700">
                Similar properties nearby
              </h2>
              <Link
                href={`/listings?purpose=${purpose}`}
                className="text-[13px] font-semibold text-foundation-700 underline underline-offset-4"
              >
                View all listings
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Mobile: the sidebar sits below the fold, so keep the enquiry in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foundation-700/10 bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700">
              {formatNaira(listing.rentAmount)}
              {priceSuffix && (
                <span className="ml-0.5 text-[12px] font-medium text-ink-muted">
                  {priceSuffix}
                </span>
              )}
            </p>
            {hasDiscount && (
              <span className="text-[12px] text-ink-muted line-through">
                {formatNaira(listing.originalPrice!)}
                {priceSuffix}
              </span>
            )}
          </div>
          <ContactOwnerButton
            unitId={listing.id}
            label={contactLabel}
            variant="accent"
            className="min-w-0 flex-1"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-foundation-700/10 bg-surface px-3.5 py-1.5">
      <span className="text-foundation-700">{icon}</span>
      <span className="text-ink-muted">{label}:</span>
      <span className="font-semibold text-foundation-700">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-foundation-700/10 pt-8">
      <p className="eyebrow">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <tr className="border-b border-foundation-700/5 last:border-b-0">
      <td className="py-2 text-ink-muted">{label}</td>
      <td
        className={`py-2 text-right tabular ${
          bold ? "font-semibold text-foundation-700" : "text-foundation-700"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
