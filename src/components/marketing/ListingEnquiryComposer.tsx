"use client";

import { AxiosError } from "axios";
import { BadgeCheck, Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { tenantApi } from "@/lib/tenant-api";
import { session } from "@/lib/session";

const noopSubscribe = () => () => {};

type ListingPurpose = "rent" | "sale" | "shortlet";

const prompts: Record<ListingPurpose, string[]> = {
  rent: [
    "Is this still available?",
    "Can I book an inspection this week?",
    "What are the total move-in costs?",
  ],
  sale: [
    "Is this property still available?",
    "Can I arrange a viewing?",
    "Please share the payment-plan details.",
  ],
  shortlet: [
    "Is it available for my dates?",
    "Can you confirm the nightly rate?",
    "What is included in the stay?",
  ],
};

interface ListingEnquiryComposerProps {
  unitId: string;
  listingHref: string;
  publisherName: string;
  publisherType: string;
  verified?: boolean;
  purpose: ListingPurpose;
}

/** Starts the existing in-app chat and immediately records a useful enquiry. */
export function ListingEnquiryComposer({
  unitId,
  listingHref,
  publisherName,
  publisherType,
  verified = false,
  purpose,
}: ListingEnquiryComposerProps) {
  const router = useRouter();
  const role = useSyncExternalStore(
    noopSubscribe,
    () => (session.getToken() ? session.getUser()?.role ?? null : null),
    () => null
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role === "admin" || role === "partner") return null;

  const openConversation = async (text: string) => {
    const trimmed = text.trim();
    if (!role) {
      router.push(`/login?next=${encodeURIComponent(listingHref)}`);
      return;
    }
    if (!trimmed) return;

    setSending(true);
    setError(null);
    try {
      const conversation = await tenantApi.startListingConversation(unitId);
      await tenantApi.sendMessage(conversation.id, trimmed);
      router.push(role === "tenant" ? `/me/chat?c=${conversation.id}` : `/app/chat/${conversation.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "We could not send your message. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-foundation-700/10 bg-paper-deep/50 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-cryola-200 text-foundation-700">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-foundation-700">Chat with {publisherName}</p>
          <p className="text-[11.5px] text-ink-muted">{publisherType}{verified ? " · identity verified" : ""}</p>
        </div>
      </div>

      <p className={`mt-3 flex items-center gap-1.5 text-[11.5px] font-medium ${verified ? "text-emerald-700" : "text-ink-muted"}`}>
        {verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {verified ? "Identity verified by Property360" : "Keep your conversation and payment records in Property360"}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {prompts[purpose].map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => void openConversation(prompt)}
            className="rounded-full border border-foundation-700/15 bg-surface px-2.5 py-1.5 text-left text-[11.5px] font-medium text-foundation-700 transition hover:border-cryola-400 hover:bg-cryola-100 disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`listing-message-${unitId}`}>Message to {publisherName}</label>
        <input
          id={`listing-message-${unitId}`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && message.trim()) {
              event.preventDefault();
              void openConversation(message);
            }
          }}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-xl border border-foundation-700/15 bg-surface px-3 py-2 text-[12.5px] text-foundation-700 outline-none transition placeholder:text-ink-muted focus:border-foundation-700"
        />
        <button
          type="button"
          aria-label="Send message"
          disabled={sending || !message.trim()}
          onClick={() => void openConversation(message)}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-foundation-700 px-3 text-paper transition hover:bg-foundation-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-2 text-[11.5px] text-red-700">{error}</p>}
    </div>
  );
}
