"use client";

import { useState, useRef } from "react";
import { X, Save, Upload, ImageIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { landlordApi, TenantProfileSnapshot } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";
import { AxiosError } from "axios";
import { NIGERIA_STATE_NAMES } from "@/lib/nigeria-locations";

const ID_TYPES = [
  { value: "nin", label: "NIN" },
  { value: "drivers", label: "Driver's licence" },
  { value: "passport", label: "International passport" },
  { value: "voters", label: "Voter's card" },
];

interface Props {
  leaseId: string;
  initial: TenantProfileSnapshot | null;
  onClose: () => void;
}

export function EditTenantProfileForm({ leaseId, initial, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [kycSelfieFile, setKycSelfieFile] = useState<File | null>(null);
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  const [dateOfBirth, setDateOfBirth] = useState(
    initial?.dateOfBirth?.slice(0, 10) ?? ""
  );
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [nin, setNin] = useState(initial?.nin ?? "");
  const [idDocumentType, setIdDocumentType] = useState(
    initial?.kyc?.document?.type ?? ""
  );
  const [idDocumentNumber, setIdDocumentNumber] = useState(
    initial?.kyc?.document?.number ?? ""
  );
  const [addressStreet, setAddressStreet] = useState(
    initial?.address?.street ?? ""
  );
  const [addressCity, setAddressCity] = useState(initial?.address?.city ?? "");
  const [addressState, setAddressState] = useState(initial?.address?.state ?? "");

  const avatarPreview = useRef<string | null>(
    initial?.avatar ?? null
  ).current;
  const selfiePreview = useRef<string | null>(
    initial?.kyc?.selfieUrl ?? null
  ).current;
  const idPreview = useRef<string | null>(
    initial?.kyc?.document?.imageUrl ?? null
  ).current;

  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (avatarFile) form.append("avatar", avatarFile);
      if (kycSelfieFile) form.append("kycSelfie", kycSelfieFile);
      if (idDocumentFile) form.append("idDocument", idDocumentFile);
      if (dateOfBirth) form.append("dateOfBirth", dateOfBirth);
      if (occupation.trim()) form.append("occupation", occupation.trim());
      if (nin.trim()) form.append("nin", nin.trim());
      if (idDocumentType) form.append("idDocumentType", idDocumentType);
      if (idDocumentNumber.trim())
        form.append("idDocumentNumber", idDocumentNumber.trim());
      if (addressStreet.trim())
        form.append("addressStreet", addressStreet.trim());
      if (addressCity.trim()) form.append("addressCity", addressCity.trim());
      if (addressState.trim()) form.append("addressState", addressState.trim());
      return landlordApi.fillTenantProfile(leaseId, form);
    },
    onSuccess: () => {
      toast.success({ title: "Tenant profile updated" });
      qc.invalidateQueries({ queryKey: ["tenant-profile", leaseId] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        (err as Error).message ??
        "Couldn't update profile";
      toast.error({ title: "Couldn't update profile", body: msg });
    },
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-tp-title"
      className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-foundation-700/10 bg-paper shadow-xl"
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
            id="edit-tp-title"
            className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em]"
          >
            Fill tenant profile
          </h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-paper/80">
            Update any subset of fields. Leave blank to keep what's on file.
          </p>
        </div>

        <form
          className="space-y-5 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FileField
              label="Profile photo"
              file={avatarFile}
              existing={avatarPreview}
              onChange={setAvatarFile}
            />
            <FileField
              label="Verification selfie"
              file={kycSelfieFile}
              existing={selfiePreview}
              onChange={setKycSelfieFile}
            />
            <FileField
              label="ID document"
              file={idDocumentFile}
              existing={idPreview}
              onChange={setIdDocumentFile}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={setDateOfBirth}
            />
            <Field
              label="Occupation"
              value={occupation}
              onChange={setOccupation}
              placeholder="e.g. Software engineer"
            />
            <Field
              label="NIN"
              value={nin}
              onChange={setNin}
              placeholder="11-digit National Identification Number"
              maxLength={20}
            />
            <SelectField
              label="ID document type"
              value={idDocumentType}
              onChange={(v) => setIdDocumentType(v)}
              options={[{ value: "", label: "—" }, ...ID_TYPES]}
            />
            <Field
              label="ID document number"
              value={idDocumentNumber}
              onChange={setIdDocumentNumber}
            />
          </div>

          <fieldset className="space-y-3 rounded-2xl border border-foundation-700/10 p-4">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Current address
            </legend>
            <Field
              label="Street"
              value={addressStreet}
              onChange={setAddressStreet}
              placeholder="Street and house number"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="City / LGA"
                value={addressCity}
                onChange={setAddressCity}
              />
              <SelectField
                label="State"
                value={addressState}
                onChange={setAddressState}
                options={[
                  { value: "", label: "—" },
                  ...NIGERIA_STATE_NAMES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving…" : "Save profile"}
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
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
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
        maxLength={maxLength}
        className="mt-1.5 block w-full rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileField({
  label,
  file,
  existing,
  onChange,
}: {
  label: string;
  file: File | null;
  existing: string | null;
  onChange: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : existing;
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-foundation-700/20 bg-paper p-3 text-center transition hover:border-foundation-700/40">
      <input
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={label}
          className="h-24 w-24 rounded-xl object-cover"
        />
      ) : (
        <div className="grid h-24 w-24 place-items-center rounded-xl bg-foundation-700/5">
          <ImageIcon className="h-6 w-6 text-foundation-700/40" />
        </div>
      )}
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foundation-700">
        <Upload className="h-3 w-3" />
        {file ? file.name : preview ? "Replace" : "Upload"}
      </span>
    </label>
  );
}
