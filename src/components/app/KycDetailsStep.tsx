"use client";

import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { AxiosError } from "axios";
import { landlordApi } from "@/lib/landlord-api";
import { session } from "@/lib/session";

const ID_TYPES = [
  { value: "nin", label: "NIN (National Identity Number)" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "International Passport" },
  { value: "voters_card", label: "Voter's Card" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

interface Props {
  /** Shown above the form when a prior submission was rejected. */
  rejectionReason?: string;
  /** Called after the ID document (and optional selfie) upload succeeds. */
  onSubmitted: () => void;
}

/**
 * Step 2 of the unified verify-account flow: identity details. Collects gender,
 * address, ID type + number, a required ID photo, an optional selfie, and a
 * required consent checkbox, then reuses the existing KYC submit calls
 * (landlordApi.uploadKycSelfie / uploadKycDocument). Submitting moves the user
 * to kyc.status = pending.
 */
export function KycDetailsStep({ rejectionReason, onSubmitted }: Props) {
  const prefill = session.getUser();
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState(ID_TYPES[0].value);
  const [num, setNum] = useState("");
  const [gender, setGender] = useState<string>(prefill?.gender ?? "");
  const [street, setStreet] = useState(prefill?.address?.street ?? "");
  const [city, setCity] = useState(prefill?.address?.city ?? "");
  const [stateVal, setStateVal] = useState(prefill?.address?.state ?? "");
  const [postalCode, setPostalCode] = useState(
    prefill?.address?.postalCode ?? ""
  );
  const [consent, setConsent] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !busy &&
    num.trim().length > 0 &&
    gender.length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    stateVal.trim().length > 0 &&
    consent &&
    !!idFile;

  async function submit() {
    if (!idFile || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      // Optional selfie first, then the ID document (which flips the status to
      // pending). Both hit the existing /kyc endpoints.
      if (selfieFile) await landlordApi.uploadKycSelfie(selfieFile);
      await landlordApi.uploadKycDocument({
        file: idFile,
        type,
        documentNumber: num.trim(),
        consent,
        gender: gender || undefined,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: stateVal.trim(),
          postalCode: postalCode.trim() || undefined,
        },
      });
      onSubmitted();
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Submission failed.")
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/40 disabled:opacity-50";

  return (
    <div>
      <p className="text-[12.5px] text-ink-muted">
        Add your identity details for review. This helps us keep the platform
        trusted and is required for some payouts.
      </p>

      {rejectionReason && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[12.5px] font-semibold text-red-700">
            Resubmission needed
          </p>
          <p className="mt-1 text-[12.5px] text-red-700/80">{rejectionReason}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          disabled={busy}
          className={inputClass}
        >
          <option value="" disabled>
            Gender
          </option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Street address"
          disabled={busy}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            disabled={busy}
            className={inputClass}
          />
          <input
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            placeholder="State"
            disabled={busy}
            className={inputClass}
          />
        </div>
        <input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal code (optional)"
          disabled={busy}
          className={inputClass}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={busy}
          className={inputClass}
        >
          {ID_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          placeholder="ID number"
          disabled={busy}
          className={inputClass}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FilePick
            label="ID photo"
            hint="Required"
            file={idFile}
            inputRef={idInputRef}
            accept="image/*,application/pdf"
            disabled={busy}
            onPick={(f) => setIdFile(f)}
          />
          <FilePick
            label="Selfie"
            hint="Optional"
            file={selfieFile}
            inputRef={selfieInputRef}
            accept="image/*"
            disabled={busy}
            onPick={(f) => setSelfieFile(f)}
          />
        </div>

        <label className="flex items-start gap-2 text-[12.5px] text-foundation-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-foundation-700/30"
          />
          <span>
            I consent to Property360 collecting and storing my ID for
            verification (per our privacy policy).
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit for review"}
      </button>

      {error && (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function FilePick({
  label,
  hint,
  file,
  inputRef,
  accept,
  disabled,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  disabled: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-foundation-700/25 bg-surface px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-foundation-700 transition hover:border-foundation-700/40 disabled:opacity-50"
      >
        {file ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Upload className="h-4 w-4 shrink-0 text-ink-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {file ? file.name : `Upload ${label.toLowerCase()}`}
          </span>
          <span className="block text-[10.5px] font-normal text-ink-muted">
            {label} &middot; {hint}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
