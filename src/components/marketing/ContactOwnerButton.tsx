"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { Loader2, MessageCircle } from "lucide-react";
import { tenantApi } from "@/lib/tenant-api";
import { session } from "@/lib/session";

const noopSubscribe = () => () => {};

interface Props {
  unitId: string;
  label?: string;
  /**
   * accent: the page's primary enquiry action (brand cryola, bold).
   * solid: dark primary button. outline: secondary, under another CTA.
   */
  variant?: "accent" | "solid" | "outline";
  className?: string;
}

/**
 * Public listing detail: opens (or resumes) an in-app conversation with the
 * listing's publisher. Any signed-in landlord, property manager or tenant can
 * enquire; each lands in their own inbox (tenants under /me, everyone else
 * under /app). Signed-out visitors are sent to login and brought back here.
 */
export function ContactOwnerButton({ unitId, label = "Message the owner", variant = "solid", className = "" }: Props) {
  const router = useRouter();
  // Session lives in localStorage, so read it on the client only.
  const role = useSyncExternalStore(
    noopSubscribe,
    () => (session.getToken() ? session.getUser()?.role ?? null : null),
    () => null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin and partner accounts have no chat inbox to land in.
  if (role === "admin" || role === "partner") return null;

  const onClick = async () => {
    if (!role) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${unitId}`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await tenantApi.startListingConversation(unitId);
      router.push(role === "tenant" ? `/me/chat?c=${c.id}` : `/app/chat/${c.id}`);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(axErr.response?.data?.message ?? "Could not open the conversation.");
      setLoading(false);
    }
  };

  const styles = {
    accent: "border border-foundation-700/10 bg-cryola-300 py-3.5 text-[14.5px] font-bold text-foundation-700 shadow-card hover:bg-cryola-400",
    solid: "bg-foundation-700 py-3 text-[13px] font-semibold text-paper hover:bg-foundation-800",
    outline: "border border-foundation-700/15 bg-paper py-3 text-[13px] font-semibold text-foundation-700 hover:bg-foundation-700/5",
  }[variant];

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 transition disabled:opacity-60 ${styles}`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className={variant === "accent" ? "h-5 w-5" : "h-4 w-4"} />}
        {loading ? "Opening chat…" : label}
      </button>
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
