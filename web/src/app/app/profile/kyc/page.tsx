"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, Check, Clock, X, Phone } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { PhoneVerifyModal } from "@/components/app/PhoneVerifyModal";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  StatusPill,
} from "@/components/app/ui";
import { landlordApi, KycStatus } from "@/lib/landlord-api";
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

const STATUS_TONE: Record<KycStatus, "good" | "warn" | "bad" | "neutral"> = {
  not_started: "neutral",
  pending: "warn",
  approved: "good",
  rejected: "bad",
};

const STATUS_LABEL: Record<KycStatus, string> = {
  not_started: "Not started",
  pending: "Under review",
  approved: "Verified",
  rejected: "Rejected",
};

export default function KycPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => landlordApi.kycStatus(),
  });

  const user = session.getUser();
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  // Bump on successful phone verification to force this component to
  // re-read session.getUser() (localStorage isn't reactive on its own).
  const [phoneTick, setPhoneTick] = useState(0);
  const rejectionReason =
    user?.kyc?.status === "rejected" ? user?.kyc?.rejectionReason : undefined;

  return (
    <>
      <AppTopbar
        title="Identity verification"
        subtitle="Required for some payouts and trust signals"
        actions={
          <Link
            href="/app/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-32 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Overall status
              </p>
              <div className="mt-2 flex items-center gap-3">
                <p className="font-display text-[22px] font-extrabold text-foundation-700">
                  {STATUS_LABEL[q.data!.overallStatus]}
                </p>
                <StatusPill
                  label={STATUS_LABEL[q.data!.overallStatus]}
                  tone={STATUS_TONE[q.data!.overallStatus]}
                />
              </div>
            </Card>

            {rejectionReason && (
              <Card className="mt-4 border-red-200 bg-red-50 p-4">
                <p className="text-[13px] font-semibold text-red-700">
                  Resubmission needed
                </p>
                <p className="mt-1 text-[12.5px] text-red-700/80">
                  {rejectionReason}
                </p>
              </Card>
            )}

            <Card className="mt-6 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Step 1
                    </p>
                    <p className="mt-1 font-display text-[15px] font-bold text-foundation-700">
                      Verify your phone
                    </p>
                    <p className="mt-1 text-[13px] text-foundation-700">
                      Optional but recommended, adds trust and lets us reach
                      you about your verification.
                    </p>
                  </div>
                </div>
                {user?.phoneVerified ? (
                  <StatusPill label="Verified" tone="good" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhoneModalOpen(true)}
                    className="shrink-0 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
                  >
                    Verify phone
                  </button>
                )}
              </div>
            </Card>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Step 2 &middot; Upload your ID and selfie
            </p>
            <div className="mt-2 grid gap-6 lg:grid-cols-2">
              <SelfieCard
                status={q.data!.selfieStatus}
                onUpload={(file) =>
                  landlordApi.uploadKycSelfie(file).then(() => {
                    qc.invalidateQueries({ queryKey: ["kyc-status"] });
                  })
                }
              />
              <DocumentCard
                status={q.data!.documentStatus}
                onUpload={(args) =>
                  landlordApi
                    .uploadKycDocument(args)
                    .then(() =>
                      qc.invalidateQueries({ queryKey: ["kyc-status"] })
                    )
                }
              />
            </div>
          </>
        )}
      </PageContainer>

      <PhoneVerifyModal
        open={phoneModalOpen}
        phone={user?.phone ?? ""}
        onClose={() => setPhoneModalOpen(false)}
        onVerified={() => {
          setPhoneModalOpen(false);
          setPhoneTick((t) => t + 1);
        }}
      />
      {/* phoneTick forces a re-render so session.getUser().phoneVerified is
          re-read after the modal completes; the value itself is unused. */}
      <span hidden>{phoneTick}</span>
    </>
  );
}

function StatusIcon({ s }: { s: KycStatus }) {
  if (s === "approved") return <Check className="h-4 w-4 text-emerald-600" />;
  if (s === "pending") return <Clock className="h-4 w-4 text-amber-600" />;
  if (s === "rejected") return <X className="h-4 w-4 text-red-600" />;
  return null;
}

function SelfieCard({
  status,
  onUpload,
}: {
  status: KycStatus;
  onUpload: (f: File) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Selfie
          </p>
          <p className="mt-1 text-[13px] text-foundation-700">
            A clear photo of your face.
          </p>
        </div>
        <span className="flex items-center gap-1.5">
          <StatusIcon s={status} />
          <StatusPill
            label={STATUS_LABEL[status]}
            tone={STATUS_TONE[status]}
          />
        </span>
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || status === "pending" || status === "approved"}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />{" "}
        {busy ? "Uploading…" : status === "rejected" ? "Re-upload" : "Upload selfie"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            await onUpload(f);
          } catch (err) {
            const ax = err as AxiosError<{ message?: string }>;
            setError(
              ax.response?.data?.message ?? (err as Error).message ?? "Upload failed"
            );
          } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
      />
      {error && (
        <p className="mt-3 text-[12.5px] text-red-700">{error}</p>
      )}
    </Card>
  );
}

function DocumentCard({
  status,
  onUpload,
}: {
  status: KycStatus;
  onUpload: (args: {
    file: File;
    type: string;
    documentNumber: string;
    consent: boolean;
    gender?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const prefill = session.getUser();
  const [type, setType] = useState(ID_TYPES[0].value);
  const [num, setNum] = useState("");
  const [gender, setGender] = useState(prefill?.gender ?? "");
  const [street, setStreet] = useState(prefill?.address?.street ?? "");
  const [city, setCity] = useState(prefill?.address?.city ?? "");
  const [stateVal, setStateVal] = useState(prefill?.address?.state ?? "");
  const [postalCode, setPostalCode] = useState(
    prefill?.address?.postalCode ?? ""
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = status === "pending" || status === "approved";
  const canSubmit =
    !locked &&
    !busy &&
    num.trim().length > 0 &&
    gender.length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    stateVal.trim().length > 0 &&
    consent;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Government ID
          </p>
          <p className="mt-1 text-[13px] text-foundation-700">
            A scan or photo of a valid Nigerian ID.
          </p>
        </div>
        <span className="flex items-center gap-1.5">
          <StatusIcon s={status} />
          <StatusPill
            label={STATUS_LABEL[status]}
            tone={STATUS_TONE[status]}
          />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={locked}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
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
          disabled={locked}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          disabled={locked}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
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
          disabled={locked}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            disabled={locked}
            className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
          />
          <input
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            placeholder="State"
            disabled={locked}
            className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
          />
        </div>
        <input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal code (optional)"
          disabled={locked}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
        />
        <label className="flex items-start gap-2 text-[12.5px] text-foundation-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={locked}
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
        onClick={() => fileRef.current?.click()}
        disabled={!canSubmit}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />{" "}
        {busy
          ? "Uploading…"
          : status === "rejected"
          ? "Re-upload"
          : "Upload document"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            await onUpload({
              file: f,
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
          } catch (err) {
            const ax = err as AxiosError<{ message?: string }>;
            setError(
              ax.response?.data?.message ?? (err as Error).message ?? "Upload failed"
            );
          } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = "";
          }
        }}
      />
      {error && (
        <p className="mt-3 text-[12.5px] text-red-700">{error}</p>
      )}
    </Card>
  );
}
