import { ImageResponse } from "next/og";
import {
  formatNaira,
  getListing,
  listingImage,
  listingTitle,
  locationLabel,
} from "@/lib/listings-api";

export const runtime = "nodejs";
export const alt = "Property360 marketplace listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { id: string };

const propertyTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    land: "Landed property",
    house: "House",
    bungalow: "House",
    apartment: "Apartment",
    residential: "Apartment",
    hostel: "Hostel room",
    shop: "Shop",
    commercial: "Commercial space",
    hotel: "Hotel room",
  };
  return labels[type ?? ""] ?? "Property";
};

export default async function ListingOpenGraphImage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const listing = await getListing(id).catch(() => null);

  if (!listing) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#102a2e",
          color: "#f8fbf1",
          fontSize: 54,
          fontWeight: 800,
        }}
      >
        Property360
      </div>,
      { ...size },
    );
  }

  const photo = listingImage(listing);
  const purpose = listing.listingPurpose ?? "rent";
  const cadence = purpose === "sale" ? "" : purpose === "shortlet" ? " / night" : " / year";
  const purposeLabel = purpose === "sale" ? "FOR SALE" : purpose === "shortlet" ? "SHORTLET" : "FOR RENT";
  const description = (
    listing.listingDescription?.trim() ||
    listing.property?.description?.trim() ||
    "Explore this verified Property360 marketplace listing."
  )
    .replace(/\s+/g, " ")
    .slice(0, 145);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#102a2e",
        color: "#f8fbf1",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: photo ? "56%" : "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 56px",
          background: photo ? "#102a2e" : "linear-gradient(135deg, #102a2e 0%, #1d4343 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 19,
              background: "#b8fa70",
              color: "#102a2e",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ fontSize: 25, fontWeight: 700 }}>Property360</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ color: "#b8fa70", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
            {purposeLabel} · {propertyTypeLabel(listing.property?.propertyType).toUpperCase()}
          </span>
          <span style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.06 }}>
            {listingTitle(listing).slice(0, 58)}
          </span>
          <span style={{ color: "#c9d4d1", fontSize: 19, lineHeight: 1.35 }}>
            {description}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ color: "#b8fa70", fontSize: 37, fontWeight: 800 }}>
            {formatNaira(listing.rentAmount)}{cadence}
          </span>
          <span style={{ color: "#c9d4d1", fontSize: 19 }}>
            {locationLabel(listing.property?.address)} · property360.africa
          </span>
        </div>
      </div>

      {photo && (
        <div style={{ display: "flex", width: "44%", height: "100%", position: "relative" }}>
          <img
            src={photo}
            alt=""
            width="100%"
            height="100%"
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(16,42,46,0.34) 0%, rgba(16,42,46,0) 45%)",
            }}
          />
        </div>
      )}
    </div>,
    { ...size },
  );
}
