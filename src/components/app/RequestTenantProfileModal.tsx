"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  landlordApi,
  TenantProfileField,
  TENANT_PROFILE_FIELD_LABELS,
} from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";
import { AxiosError } from "axios";

const ALL_FIELDS: TenantProfileField[] = [
  "avatar",
  "dateOfBirth",
  "currentAddress",
  "nin",
  "idDocument",
  "kycSelfie",
  "occupation",
];

interface Props {
  leaseId: string;
  /** Fields already on file — pre-unchecked so the landlord asks only for what's missing. */
  filledFields?: TenantProfileField[];
  onClose: () => void;
}

export function RequestTenantProfileModal({
  leaseId,
  filledFields = [],
  onClose,
}: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const filledSet = new Set(filledFields);
  const [selected, setSelected] = useState<Set<TenantProfileField>>(() => {
    // Default-select fields the tenant hasn't filled yet.
    return new Set(ALL_FIELDS.filter((f) => !filledSet.has(f)));
  });
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      landlordApi.createTenantProfileRequest({
        leaseId,
        fields: Array.from(selected),
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success({
        title: "Request sent",
        body: "Your tenant will get a notification and email.",
      });
      qc.invalidateQueries({ queryKey: ["tenant-profile-requests", leaseId] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        (err as Error).message ??
        "Couldn't send the request";
      toast.error({ title: "Couldn't send request", body: msg });
    },
  });

  function toggle(field: TenantProfileField) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="req-tp-title"
      className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-foundation-700 px-6 pb-5 pt-7 text-paper">
          <h2
            id="req-tp-title"
            className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em]"
          >
            Request profile info
          </h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-paper/80">
            Pick what you need. Your tenant gets a notification and email
            with a one-tap link to fill it in.
          </p>
        </div>

        <form
          className="space-y-5 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected.size === 0) {
              toast.error({ title: "Pick at least one field" });
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_FIELDS.map((field) => {
              const checked = selected.has(field);
              const alreadyFilled = filledSet.has(field);
              return (
                <label
                  key={field}
                  className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-3 py-2.5 text-[12.5px] transition ${
                    checked
                      ? "border-foundation-700 bg-foundation-700/5"
                      : "border-foundation-700/10 bg-paper hover:bg-foundation-700/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(field)}
                    className="mt-0.5 h-4 w-4 rounded border-foundation-700/30 text-foundation-700 focus:ring-foundation-700"
                  />
                  <span>
                    <span className="block font-semibold text-foundation-700">
                      {TENANT_PROFILE_FIELD_LABELS[field]}
                    </span>
                    {alreadyFilled && (
                      <span className="text-[11px] text-ink-muted">
                        On file — re-request to overwrite
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="message"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted"
            >
              Note to tenant (optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. We need these for the lease registration with the agent."
              className="mt-2 w-full resize-none rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={mutation.isPending || selected.size === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Sending…" : "Send request"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
