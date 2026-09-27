import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Conversation } from "@/lib/tenant-api";
import { DEFAULT_PROPERTY_IMAGE } from "@/lib/propertyImage";
import {
  conversationListingHref,
  conversationLocation,
  conversationPrice,
  conversationTitle,
} from "./chat-utils";

/**
 * The property a thread is about, pinned above the messages so both sides
 * always know which listing they are discussing. Links to the public
 * listing while it is still on the marketplace.
 */
export function ConversationListingCard({
  conversation,
  showLink = true,
}: {
  conversation: Conversation;
  /** Off inside the listing page's own chat panel. */
  showLink?: boolean;
}) {
  const href = showLink ? conversationListingHref(conversation) : null;
  const price = conversationPrice(conversation);
  const location = conversationLocation(conversation);

  const body = (
    <>
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-foundation-700/5">
        <Image
          src={conversation.property?.image || DEFAULT_PROPERTY_IMAGE}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-foundation-700">
          {conversationTitle(conversation)}
        </span>
        {price && (
          <span className="block text-[13px] font-bold text-foundation-700">{price}</span>
        )}
        {location && (
          <span className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-ink-muted">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </span>
        )}
      </span>
      {href && (
        <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700">
          View property <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  const className =
    "flex items-center gap-3 border-b border-foundation-700/10 bg-cryola-50 px-4 py-3";

  return href ? (
    // New tab, so the conversation stays open while they look at the listing.
    <Link href={href} target="_blank" rel="noopener" className={`${className} transition hover:bg-cryola-100`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
