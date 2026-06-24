/**
 * Server-only API client for the public listings endpoints.
 *
 * Uses native fetch so Next can apply ISR via `next: { revalidate }`.
 * Listings change frequently but not by the second — 60s revalidate balances
 * freshness against backend load and gives Google a cacheable page.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.property360.africa/api/v1";

const REVALIDATE_SECONDS = 60;

export interface ListingAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  landmark?: string;
}

export interface ListingProperty {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  address?: ListingAddress;
  propertyType?: string;
  images?: string[];
  amenities?: string[];
  owner?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    // Browse endpoint projects a flat kycStatus; the detail endpoint populates
    // the nested kyc object. isLandlordVerified() handles both shapes.
    kycStatus?: string;
    kyc?: { status?: string };
  };
}

export interface ListingFees {
  securityDeposit?: number;
  cautionFee?: number;
  agentFee?: number;
  agreementFee?: number;
  legalFee?: number;
  serviceCharge?: number;
}

export interface Listing {
  id: string;
  _id?: string;
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  rentAmount: number;
  listingTitle?: string;
  listingDescription?: string;
  listingStatus?: "active" | "inactive" | "reserved";
  listedAt?: string;
  defaultFees?: ListingFees;
  inspectionFee?: number;
  inspectionFeeEnabled?: boolean;
  virtualTourUrl?: string;
  preferredTenantType?: "single" | "family" | "students" | "professionals" | "any";
  availableFrom?: string;
  isNegotiable?: boolean;
  property: ListingProperty;
}

export interface ListingsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListingsResult {
  listings: Listing[];
  meta: ListingsMeta;
}

export interface ListingsQuery {
  page?: number;
  limit?: number;
  state?: string;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  search?: string;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: ListingsMeta;
}

function buildQuery(params: ListingsQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getListings(query: ListingsQuery = {}): Promise<ListingsResult> {
  const url = `${API_BASE_URL}/listings${buildQuery(query)}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["listings"] },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) {
      return { listings: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    throw new Error(`Failed to load listings (${res.status})`);
  }
  const envelope = (await res.json()) as Envelope<Listing[]>;
  return {
    listings: envelope.data ?? [],
    meta:
      envelope.meta ??
      { total: envelope.data?.length ?? 0, page: 1, limit: 20, totalPages: 1 },
  };
}

export async function getListing(id: string): Promise<Listing | null> {
  const url = `${API_BASE_URL}/listings/${id}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["listings", `listing:${id}`] },
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load listing (${res.status})`);
  const envelope = (await res.json()) as Envelope<Listing>;
  return envelope.data;
}

/** Format an NGN amount as ₦1.2M / ₦650k / ₦18,500. Used in card pricing. */
export function formatNaira(amount?: number): string {
  if (!amount && amount !== 0) return "—";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const trimmed = millions >= 10 ? millions.toFixed(0) : millions.toFixed(1);
    return `₦${trimmed.replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000) {
    return `₦${Math.round(amount / 1_000)}k`;
  }
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatNairaFull(amount?: number): string {
  if (!amount && amount !== 0) return "—";
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function locationLabel(address?: ListingAddress): string {
  if (!address) return "Nigeria";
  const parts = [address.city, address.state].filter(Boolean);
  return parts.join(", ") || "Nigeria";
}

export function listingTitle(listing: Listing): string {
  if (listing.listingTitle) return listing.listingTitle;
  const beds = listing.bedrooms ? `${listing.bedrooms}-bedroom` : "Unit";
  const type = listing.property?.propertyType || "home";
  return `${beds} ${type}`;
}

export function listingImage(listing: Listing): string | null {
  const images = listing.property?.images ?? [];
  return images[0] ?? null;
}

/**
 * True when the listing's landlord has passed identity (KYC) verification.
 * Handles both the browse shape (owner.kycStatus) and the detail shape
 * (owner.kyc.status). Drives the "Verified landlord" trust badge.
 */
export function isLandlordVerified(listing: Listing): boolean {
  const owner = listing.property?.owner;
  return owner?.kycStatus === "verified" || owner?.kyc?.status === "verified";
}
