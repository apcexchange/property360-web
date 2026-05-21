"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";
import { Check, Loader2 } from "lucide-react";
import { tenantApi } from "@/lib/tenant-api";
import { session } from "@/lib/session";

interface Props {
  unitId: string;
  reserved: boolean;
  /** Used to build the post-login redirect target. */
  listingHref: string;
}

/**
 * Public listing detail CTA. Handles three states:
 *   1. visitor not signed in → "Sign in to reserve" links to /login?next=
 *   2. signed in as tenant → form to send the reservation request
 *   3. signed in as non-tenant (landlord / property manager) → explanatory
 *      message; reservation is a tenant-only action
 *
 * Reads ?action=reserve from the URL to auto-expand the form on landing
 * (mirroring the mobile deep-link).
 */
export function ReserveListingCTA({ unitId, reserved, listingHref }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const wantsReserve = params?.get("action") === "reserve";

  const [user, setUser] = useState(() => session.getUser());
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setUser(session.getUser());
  }, []);

  useEffect(() => {
    if (wantsReserve && user?.role === "tenant" && !reserved) setOpen(true);
  }, [wantsReserve, user?.role, reserved]);

  if (reserved) {
    return (
      <div className="rounded-2xl border border-foundation-700/15 bg-paper px-5 py-3 text-center text-[13px] font-semibold text-foundation-700">
        This unit is already reserved.
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`${listingHref}?action=reserve`);
    return (
      <Link
        href={`/login?next=${next}`}
        className="flex w-full items-center justify-center rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        Sign in to reserve
      </Link>
    );
  }

  if (user.role !== "tenant") {
    return (
      <div className="rounded-2xl border border-foundation-700/10 bg-paper-deep/40 px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
        Reserving is a tenant action. You&apos;re signed in as a {user.role}
        {user.role === "agent" ? " (property manager)" : ""}.
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
        <p className="flex items-center gap-1.5 font-semibold">
          <Check className="h-4 w-4" />
          Reservation request sent.
        </p>
        <p className="mt-1 text-[12.5px] text-emerald-700/80">
          The landlord will review and respond. Track it in{" "}
          <Link href="/me" className="font-semibold underline">
            your tenant home
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        Reserve this unit
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
          await tenantApi.createReservation(unitId, message.trim() || undefined);
          setSuccess(true);
          router.replace(listingHref);
        } catch (err) {
          const axErr = err as AxiosError<{ message?: string }>;
          setError(
            axErr.response?.data?.message ??
              (err instanceof Error
                ? err.message
                : "Could not send the request.")
          );
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <label className="block">
        <span className="eyebrow block text-[10px]">Message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Hi, I'd love to inspect this unit this weekend if possible."
          className="mt-1 w-full rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
        />
      </label>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Sending…" : "Send reservation request"}
        </button>
      </div>
    </form>
  );
}
