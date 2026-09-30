import type { Conversation, Message } from "@/lib/tenant-api";
import { formatNaira } from "@/lib/listings-api";

/**
 * Chat lives in two shells: /app (landlords and property managers) and /me
 * (tenants). The endpoints are the same for both; only the React Query keys
 * differ, and the sidebars watch these exact unread-count keys.
 */
export type ChatScope = "app" | "me";

export function chatKeys(scope: ChatScope) {
  const base = scope === "app" ? ["chat"] : ["me", "chat"];
  return {
    conversations: [...base, "conversations"],
    messages: (id: string) => [...base, "messages", id],
    unread: [scope, "chat", "unread-count"],
  };
}

export function chatScopeForRole(role?: string | null): ChatScope {
  return role === "tenant" ? "me" : "app";
}

export function chatInboxHref(scope: ChatScope, id?: string | null): string {
  if (scope === "app") return id ? `/app/chat/${id}` : "/app/chat";
  return id ? `/me/chat?c=${id}` : "/me/chat";
}

/** What the thread is about, e.g. "2-bedroom flat" or the property name. */
export function conversationTitle(c: Conversation): string {
  if (c.listing?.listingTitle) return c.listing.listingTitle;
  if (c.listing?.bedrooms) {
    return `${c.listing.bedrooms}-bedroom ${c.property?.propertyType ?? "home"}`;
  }
  return c.property?.name || "Property";
}

export function conversationPrice(c: Conversation): string | null {
  if (c.listing?.rentAmount == null) return null;
  const purpose = c.listing.listingPurpose ?? "rent";
  const suffix = purpose === "sale" ? "" : purpose === "shortlet" ? "/night" : "/year";
  return `${formatNaira(c.listing.rentAmount)}${suffix}`;
}

export function conversationLocation(c: Conversation): string | null {
  const parts = [c.property?.city, c.property?.state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Public listing page, only while the unit is still on the marketplace. */
export function conversationListingHref(c: Conversation): string | null {
  return c.listing?.isListed ? `/listings/${c.listing.id}` : null;
}

export function personName(p?: { firstName?: string; lastName?: string } | null): string {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Property360 user";
}

export function initials(p?: { firstName?: string; lastName?: string } | null): string {
  return ((p?.firstName?.[0] ?? "") + (p?.lastName?.[0] ?? "")).toUpperCase() || "?";
}

export function messageText(m: Message): string {
  return m.text ?? m.content ?? "";
}

export function messageSenderId(m: Message): string {
  return typeof m.sender === "string" ? m.sender : m.sender._id;
}
