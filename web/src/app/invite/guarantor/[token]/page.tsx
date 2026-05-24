"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AxiosError } from "axios";
import { Camera, CheckCircle2, Loader2, Mail } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { NIGERIA_STATES } from "@/lib/nigeria-locations";

interface InvitePreview {
  addressee: "tenant" | "guarantor";
  requirePassport: boolean;
  inviteName?: string;
  tenant: { firstName: string; lastName: string };
  landlord: { firstName: string; lastName: string };
  property: {
    name: string;
    address?: { street?: string; city?: string; state?: string };
  };
  unit: { unitNumber: string };
  status: string;
  expiresAt: string;
}

const ID_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "nin", label: "NIN" },
  { value: "drivers", label: "Driver's licence" },
  { value: "passport", label: "International passport" },
  { value: "voters", label: "Voter's card" },
];

export default function GuarantorInvitePage() {
  const { token } = useParams<{ token: string }>();

  const preview = useQuery({
    queryKey: ["guarantor-invite", token],
    queryFn: async (): Promise<InvitePreview> => {
      const res = await api.get(`/public/guarantor-requests/${token}`);
      return unwrap(res.data) as InvitePreview;
    },
    retry: false,
  });

  if (preview.isLoading) {
    return <Shell><LoadingCard /></Shell>;
  }
  if (preview.isError) {
    const ax = preview.error as AxiosError<{ message?: string }>;
    const msg =
      ax.response?.data?.message ??
      (preview.error as Error).message ??
      "This invitation can no longer be opened.";
    return (
      <Shell>
        <FailureCard message={msg} />
      </Shell>
    );
  }

  return (
    <Shell>
      <InviteForm token={token} preview={preview.data!} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-foundation-700/10 bg-paper">
        <div className="mx-auto flex max-w-3xl items-baseline gap-1 px-6 py-5">
          <span className="font-display text-[24px] font-medium tracking-[-0.035em] text-foundation-700">
            Property
          </span>
          <span className="font-display text-[24px] font-medium tracking-[-0.035em] text-cryola-500">
            360
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-foundation-700/10 bg-paper p-12 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-foundation-700" />
      <p className="text-[14px] text-ink-muted">Loading invitation…</p>
    </div>
  );
}

function FailureCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-10">
      <h1 className="font-display text-[22px] font-extrabold text-red-700">
        Invitation unavailable
      </h1>
      <p className="mt-2 text-[14px] text-red-800">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-full bg-foundation-700 px-5 py-2 text-[13px] font-semibold text-paper hover:bg-foundation-800"
      >
        Visit Property360
      </Link>
    </div>
  );
}

function InviteForm({
  token,
  preview,
}: {
  token: string;
  preview: InvitePreview;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [g, setG] = useState({
    firstName: preview.addressee === "guarantor" && preview.inviteName
      ? preview.inviteName.split(" ")[0] ?? ""
      : "",
    lastName: preview.addressee === "guarantor" && preview.inviteName
      ? preview.inviteName.split(" ").slice(1).join(" ") ?? ""
      : "",
    phone: "",
    relationship: "",
    email: "",
    occupation: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    idType: "",
    idNumber: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [passport, setPassport] = useState<File | null>(null);

  const stateCities = useMemo(
    () => NIGERIA_STATES.find((s) => s.name === g.addressState)?.cities ?? [],
    [g.addressState]
  );

  const submit = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(g).forEach(([k, v]) => {
        if (v !== "" && v != null) form.append(k, String(v));
      });
      if (passport) form.append("passport", passport);
      const res = await api.post(
        `/public/guarantor-requests/${token}/submit`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err as Error).message ??
          "Couldn't submit the form. Please try again."
      );
    },
  });

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="mt-3 font-display text-[24px] font-extrabold text-emerald-800">
          Thank you — submitted.
        </h1>
        <p className="mt-2 text-[14px] text-emerald-800">
          The information has been sent to {preview.landlord.firstName}{" "}
          {preview.landlord.lastName}. You can close this page.
        </p>
      </div>
    );
  }

  const canSubmit =
    g.firstName.trim() &&
    g.lastName.trim() &&
    g.phone.trim() &&
    g.relationship.trim() &&
    (!preview.requirePassport || passport);

  const intro =
    preview.addressee === "tenant"
      ? `${preview.landlord.firstName} ${preview.landlord.lastName} has asked you to provide your guarantor's information for your tenancy.`
      : `${preview.landlord.firstName} ${preview.landlord.lastName} has asked you to fill in your details as guarantor for ${preview.tenant.firstName} ${preview.tenant.lastName}.`;

  const addressLine = [
    preview.property.address?.street,
    preview.property.address?.city,
    preview.property.address?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-3xl border border-foundation-700/10 bg-paper p-8 sm:p-10">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Guarantor information request
      </p>
      <h1 className="mt-2 font-display text-[24px] font-extrabold text-foundation-700">
        {preview.addressee === "tenant"
          ? "Provide your guarantor's details"
          : `Confirm your details as guarantor`}
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">{intro}</p>
      <p className="mt-1 text-[13px] text-ink-muted">
        Property: {preview.property.name}, Unit {preview.unit.unitNumber}
        {addressLine && ` · ${addressLine}`}
      </p>

      <hr className="my-6 border-foundation-700/10" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) {
            setError(null);
            submit.mutate();
          }
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" required>
            <Input
              value={g.firstName}
              onChange={(v) => setG({ ...g, firstName: v })}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={g.lastName}
              onChange={(v) => setG({ ...g, lastName: v })}
            />
          </Field>
          <Field label="Phone" required>
            <Input value={g.phone} onChange={(v) => setG({ ...g, phone: v })} />
          </Field>
          <Field label="Relationship to tenant" required>
            <Input
              value={g.relationship}
              onChange={(v) => setG({ ...g, relationship: v })}
              placeholder="eg. Father, Uncle, Friend"
            />
          </Field>
          <Field label="Email">
            <Input value={g.email} onChange={(v) => setG({ ...g, email: v })} />
          </Field>
          <Field label="Occupation">
            <Input
              value={g.occupation}
              onChange={(v) => setG({ ...g, occupation: v })}
            />
          </Field>
          <Field label="ID type">
            <Select
              value={g.idType}
              onChange={(v) => setG({ ...g, idType: v })}
              options={ID_TYPE_OPTIONS}
            />
          </Field>
          <Field label="ID number">
            <Input
              value={g.idNumber}
              onChange={(v) => setG({ ...g, idNumber: v })}
            />
          </Field>
          <Field label="Street">
            <Input
              value={g.addressStreet}
              onChange={(v) => setG({ ...g, addressStreet: v })}
            />
          </Field>
          <Field label="State">
            <Select
              value={g.addressState}
              onChange={(v) =>
                setG({ ...g, addressState: v, addressCity: "" })
              }
              options={[
                { value: "", label: "—" },
                ...NIGERIA_STATES.map((s) => ({
                  value: s.name,
                  label: s.name,
                })),
              ]}
            />
          </Field>
          <Field label="City">
            <Select
              value={g.addressCity}
              onChange={(v) => setG({ ...g, addressCity: v })}
              disabled={!g.addressState}
              options={[
                {
                  value: "",
                  label: g.addressState ? "—" : "Pick a state first",
                },
                ...stateCities.map((c) => ({ value: c, label: c })),
              ]}
            />
          </Field>
        </div>

        {preview.requirePassport && (
          <div className="mt-2">
            <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Passport photo
              <span className="ml-1 text-red-600">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foundation-700/20 bg-foundation-700/5 px-4 py-7 text-center transition hover:bg-foundation-700/10"
            >
              <Camera className="h-5 w-5 text-foundation-700" />
              {passport ? (
                <>
                  <p className="text-[13px] font-semibold text-foundation-700">
                    {passport.name}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {(passport.size / 1024).toFixed(1)} KB · click to change
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-foundation-700">
                    Upload a clear photograph of yourself
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    JPEG or PNG, max 10 MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPassport(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11.5px] text-ink-muted">
            <Mail className="mr-1 inline h-3 w-3" />
            Submitting will share the information above with{" "}
            {preview.landlord.firstName} {preview.landlord.lastName}.
          </p>
          <button
            type="submit"
            disabled={!canSubmit || submit.isPending}
            className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
          >
            {submit.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13.5px] text-foundation-700"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13.5px] text-foundation-700 disabled:bg-foundation-700/5 disabled:text-ink-muted"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
