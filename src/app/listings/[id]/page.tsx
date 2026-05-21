import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BedDouble, Bath, Square, MapPin, Calendar, Check } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import {
  getListing,
  formatNaira,
  formatNairaFull,
  listingTitle,
  locationLabel,
} from "@/lib/listings-api";

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
  const description =
    listing.listingDescription ||
    `${listing.bedrooms ?? "—"}-bedroom ${listing.property?.propertyType ?? "home"} for ${formatNaira(
      listing.rentAmount
    )}/year in ${locationLabel(listing.property?.address)}.`;
  const image = listing.property?.images?.[0];

  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title,
      description,
      url: `https://property360.africa/listings/${id}`,
      type: "website",
      images: image ? [image] : undefined,
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
  const amenities = listing.property?.amenities ?? [];
  const fees = listing.defaultFees ?? {};
  const reserved = listing.listingStatus === "reserved";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: listingTitle(listing),
    description: listing.listingDescription,
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
    <div className="min-h-screen bg-paper text-foundation-700">
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

        <h1 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          {listingTitle(listing)}
        </h1>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
          <MapPin className="h-3.5 w-3.5" /> {locationLabel(listing.property?.address)}
          {listing.property?.address?.street && (
            <span className="text-ink-faint"> · {listing.property.address.street}</span>
          )}
        </p>

        <Gallery images={images} alt={listingTitle(listing)} />

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13.5px] text-foundation-700">
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
                  value={new Date(listing.availableFrom).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              ) : null}
            </div>

            {listing.listingDescription && (
              <Section title="About this home">
                <p className="whitespace-pre-line text-[15px] leading-[1.65] text-ink-body">
                  {listing.listingDescription}
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
                  <Row label="Annual rent" value={formatNairaFull(listing.rentAmount)} bold />
                  {fees.securityDeposit ? (
                    <Row
                      label="Security deposit"
                      value={formatNairaFull(fees.securityDeposit)}
                    />
                  ) : null}
                  {fees.cautionFee ? (
                    <Row label="Caution fee" value={formatNairaFull(fees.cautionFee)} />
                  ) : null}
                  {fees.agentFee ? (
                    <Row label="Agent fee" value={formatNairaFull(fees.agentFee)} />
                  ) : null}
                  {fees.agreementFee ? (
                    <Row label="Agreement fee" value={formatNairaFull(fees.agreementFee)} />
                  ) : null}
                  {fees.legalFee ? (
                    <Row label="Legal fee" value={formatNairaFull(fees.legalFee)} />
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
                Costs are set by the landlord and may be negotiable on inspection.
              </p>
            </Section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-foundation-700/10 bg-surface p-6 shadow-card">
              <p className="text-[12px] uppercase tracking-[0.16em] text-foundation-700">
                {reserved ? "Reserved" : "Available"}
              </p>
              <p className="mt-2 font-display text-[34px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700">
                {formatNaira(listing.rentAmount)}
                <span className="ml-1 text-[14px] font-medium text-ink-muted">/year</span>
              </p>
              {listing.isNegotiable && (
                <p className="mt-1 text-[12px] text-foundation-700">Negotiable</p>
              )}

              <div className="mt-5 space-y-3">
                <Link
                  href={`/listings/${listing.id}?action=reserve`}
                  className="flex w-full items-center justify-center rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
                >
                  {reserved ? "Reserved — get the app" : "Reserve in the app"}
                </Link>
                <Link
                  href={`/listings/${listing.id}?action=contact`}
                  className="flex w-full items-center justify-center rounded-full border border-foundation-700/15 bg-paper px-5 py-3 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                >
                  Contact landlord
                </Link>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                Both actions open Property360 on your phone. New here? Get the app:
              </p>
              <AppStoreButtons className="mt-3" />
            </div>

            <div className="mt-5 rounded-2xl border border-foundation-700/10 bg-paper-deep/60 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p className="font-semibold text-foundation-700">Why Property360?</p>
              <ul className="mt-2 space-y-1.5">
                <li>· Every landlord is identity-verified.</li>
                <li>· Pay through Paystack — no cash to strangers.</li>
                <li>· Tenancy agreement signed in-app.</li>
              </ul>
            </div>
          </aside>
        </div>
      </article>

      <Footer />
    </div>
  );
}

function Gallery({ images, alt }: { images: string[]; alt: string }) {
  if (images.length === 0) {
    return (
      <div className="mt-6 grid aspect-[16/8] w-full place-items-center rounded-2xl bg-foundation-700/5 text-[12px] uppercase tracking-[0.18em] text-ink-faint">
        No photos yet
      </div>
    );
  }
  const [primary, ...rest] = images;
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-[1.6fr_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-foundation-700/5">
        <Image
          src={primary}
          alt={alt}
          fill
          sizes="(min-width: 640px) 60vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-rows-2 gap-3">
          {rest.slice(0, 2).map((src, i) => (
            <div
              key={src + i}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-foundation-700/5"
            >
              <Image
                src={src}
                alt={`${alt} – photo ${i + 2}`}
                fill
                sizes="(min-width: 640px) 30vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
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
