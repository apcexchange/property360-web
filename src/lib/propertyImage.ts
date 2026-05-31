import type { PropertyImage } from "./landlord-api";

// Public path of the on-brand placeholder served from /public. The asset
// is a self-contained SVG (no external requests), so it loads instantly
// and stays consistent if Cloudinary or any image CDN is unreachable.
export const DEFAULT_PROPERTY_IMAGE = "/property-default.svg";

/**
 * Resolve the cover image to render for a property. Returns the landlord's
 * uploaded primary image when available, otherwise the bundled brand
 * placeholder so list cards, detail headers, and listing galleries never
 * show a bare grey box. Every consumer goes through this helper so the
 * fallback rule is changed in one place.
 */
export function getPropertyCoverImage(
  property: { images?: PropertyImage[] | null } | null | undefined
): string {
  if (!property) return DEFAULT_PROPERTY_IMAGE;
  const images = property.images ?? [];
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return primary?.url || DEFAULT_PROPERTY_IMAGE;
}

/**
 * Same as `getPropertyCoverImage`, but for cases where the caller has
 * already extracted an image array (e.g. the Gallery component on the
 * public listing page). Returns at least one URL so the gallery always
 * has something to render.
 */
export function ensureCoverImages(urls: string[] | null | undefined): string[] {
  if (urls && urls.length > 0) return urls;
  return [DEFAULT_PROPERTY_IMAGE];
}
