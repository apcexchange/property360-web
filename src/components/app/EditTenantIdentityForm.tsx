"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  landlordApi,
  TenantIdentityUpdate,
  TenantProfileSnapshot,
} from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";
import { AxiosError } from "axios";

interface Props {
  leaseId: string;
  initial: TenantProfileSnapshot;
  onClose: () => void;
}

export function EditTenantIdentityForm({ leaseId, initial, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");

  const phoneChanged = phone.trim() !== (initial.phone ?? "");

  const mutation = useMutation({
    mutationFn: (): Promise<TenantIdentityUpdate> =>
      landlordApi.updateTenantIdentity(leaseId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    onSuccess: () => {
      toast.success({
        title: "Tenant details updated",
        body: phoneChanged
          ? "The tenant will need to re-verify their WhatsApp number."
          : undefined,
      });
      qc.invalidateQueries({ queryKey: ["tenant-profile", leaseId] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        (err as Error).message ??
        "Couldn't update tenant details";
      toast.error({ title: "Couldn't update tenant details", body: msg });
    },
  });

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    phone.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-identity-title"
      className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-xl"
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
            id="edit-identity-title"
            className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em]"
          >
            Edit tenant details
          </h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-paper/80">
            Changing the phone number resets WhatsApp verification, the
            tenant will need to re-verify.
          </p>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="+234..."
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving…" : "Save changes"}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700"
      />
    </label>
  );
}
