"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, Check } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  EmptyState,
} from "@/components/app/ui";
import { tenantApi, TenantProfileField } from "@/lib/tenant-api";
import { useToast } from "@/components/ui/Toast";

const ID_DOC_TYPES = [
  { value: "nin", label: "NIN slip" },
  { value: "drivers", label: "Driver's license" },
  { value: "passport", label: "International passport" },
  { value: "voters", label: "Voter's card" },
];

const FIELD_TITLES: Record<TenantProfileField, string> = {
  avatar: "Profile photo",
  dateOfBirth: "Date of birth",
  currentAddress: "Current address",
  nin: "National Identification Number (NIN)",
  idDocument: "ID document",
  kycSelfie: "Verification selfie",
  occupation: "Occupation",
};

export default function ProfileRequestPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ["me", "profile-request", id],
    queryFn: () => tenantApi.getProfileRequest(id),
    enabled: !!id,
  });

  // Field state — only the requested ones are shown, but we keep all here.
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nin, setNin] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [kycSelfieFile, setKycSelfieFile] = useState<File | null>(null);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const requested = useMemo(
    () => q.data?.requestedFields ?? [],
    [q.data?.requestedFields]
  );

  // Mirror the backend's per-field "is provided" rule so we only enable submit
  // once everything the landlord asked for is filled.
  const isProvided = (f: TenantProfileField): boolean => {
    switch (f) {
      case "avatar":
        return !!avatarFile;
      case "kycSelfie":
        return !!kycSelfieFile;
      case "idDocument":
        return !!idDocumentFile && !!idDocumentType && !!idDocumentNumber.trim();
      case "dateOfBirth":
        return !!dateOfBirth;
      case "occupation":
        return !!occupation.trim();
      case "nin":
        return nin.trim().length >= 6;
      case "currentAddress":
        return !!(street.trim() || city.trim() || stateName.trim());
    }
  };

  const allComplete = requested.every(isProvided);

  const submit = useMutation({
    mutationFn: () => {
      const form = new FormData();
      for (const f of requested) {
        switch (f) {
          case "avatar":
            if (avatarFile) form.append("avatar", avatarFile);
            break;
          case "kycSelfie":
            if (kycSelfieFile) form.append("kycSelfie", kycSelfieFile);
            break;
          case "idDocument":
            if (idDocumentFile) form.append("idDocument", idDocumentFile);
            form.append("idDocumentType", idDocumentType);
            form.append("idDocumentNumber", idDocumentNumber.trim());
            break;
          case "dateOfBirth":
            form.append("dateOfBirth", dateOfBirth);
            break;
          case "occupation":
            form.append("occupation", occupation.trim());
            break;
          case "nin":
            form.append("nin", nin.trim());
            break;
          case "currentAddress":
            if (street.trim()) form.append("addressStreet", street.trim());
            if (city.trim()) form.append("addressCity", city.trim());
            if (stateName.trim()) form.append("addressState", stateName.trim());
            if (postalCode.trim())
              form.append("addressPostalCode", postalCode.trim());
            break;
        }
      }
      return tenantApi.submitProfileRequest(id, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "profile-requests"] });
      qc.invalidateQueries({ queryKey: ["me", "notifications"] });
      toast.success("Details shared with your landlord. Thank you!");
      router.push("/me");
    },
  });

  const submitError = (() => {
    if (!submit.isError) return null;
    const err = submit.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <TenantTopbar
        title="Complete your profile"
        subtitle="Your landlord asked you to share a few details"
        actions={
          <Link
            href="/me"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-48 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : !q.data ? (
          <EmptyState
            title="Request not found"
            body="This request may have been cancelled or already completed."
          />
        ) : q.data.status !== "pending" ? (
          <EmptyState
            title={
              q.data.status === "submitted"
                ? "Already submitted"
                : q.data.status === "expired"
                ? "This request has expired"
                : "This request is no longer active"
            }
            body={
              q.data.status === "submitted"
                ? "You've already shared these details. Nothing else to do."
                : "Ask your landlord to send a new request if you still need to share your details."
            }
          />
        ) : (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (allComplete) submit.mutate();
            }}
          >
            <Card className="p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {q.data.property?.name}
                {q.data.unit?.unitNumber
                  ? ` · Unit ${q.data.unit.unitNumber}`
                  : ""}
              </p>
              <p className="mt-2 text-[13.5px] text-foundation-700">
                {q.data.message
                  ? q.data.message
                  : `${
                      q.data.landlord?.firstName
                        ? `${q.data.landlord.firstName} ${q.data.landlord.lastName ?? ""}`.trim()
                        : "Your landlord"
                    } asked you to share the details below.`}
              </p>
            </Card>

            {requested.map((f) => (
              <Card key={f} className="space-y-4 p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  {FIELD_TITLES[f]}
                </h2>

                {f === "dateOfBirth" && (
                  <Field label="Date of birth">
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                    />
                  </Field>
                )}

                {f === "occupation" && (
                  <Field label="Occupation">
                    <Input
                      value={occupation}
                      onChange={setOccupation}
                      placeholder="e.g. Software engineer"
                    />
                  </Field>
                )}

                {f === "nin" && (
                  <Field label="NIN">
                    <Input
                      value={nin}
                      onChange={setNin}
                      placeholder="11-digit NIN"
                    />
                  </Field>
                )}

                {f === "currentAddress" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Street">
                      <Input value={street} onChange={setStreet} />
                    </Field>
                    <Field label="City">
                      <Input value={city} onChange={setCity} />
                    </Field>
                    <Field label="State">
                      <Input value={stateName} onChange={setStateName} />
                    </Field>
                    <Field label="Postal code (optional)">
                      <Input value={postalCode} onChange={setPostalCode} />
                    </Field>
                  </div>
                )}

                {f === "idDocument" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Document type">
                        <Select
                          value={idDocumentType}
                          onChange={setIdDocumentType}
                          options={[
                            { value: "", label: "Choose a type" },
                            ...ID_DOC_TYPES,
                          ]}
                        />
                      </Field>
                      <Field label="Document number">
                        <Input
                          value={idDocumentNumber}
                          onChange={setIdDocumentNumber}
                        />
                      </Field>
                    </div>
                    <FileField
                      label="Upload document"
                      file={idDocumentFile}
                      onPick={setIdDocumentFile}
                    />
                  </div>
                )}

                {f === "avatar" && (
                  <FileField
                    label="Upload a profile photo"
                    file={avatarFile}
                    onPick={setAvatarFile}
                  />
                )}

                {f === "kycSelfie" && (
                  <FileField
                    label="Upload a clear selfie"
                    file={kycSelfieFile}
                    onPick={setKycSelfieFile}
                  />
                )}
              </Card>
            ))}

            {submitError && <ErrorBox message={submitError} />}

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/me"
                className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!allComplete || submit.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {submit.isPending ? "Submitting…" : "Submit to landlord"}
              </button>
            </div>
          </form>
        )}
      </PageContainer>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 placeholder:text-ink-muted/60 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FileField({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-foundation-700/25 bg-foundation-700/[0.02] px-4 py-3.5 transition hover:border-foundation-700/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700/5 text-foundation-700">
        {file ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-foundation-700">
          {file ? file.name : label}
        </span>
        <span className="block text-[11.5px] text-ink-muted">
          {file ? "Tap to replace" : "JPEG, PNG, HEIC or WebP · up to 10 MB"}
        </span>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/heic,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
