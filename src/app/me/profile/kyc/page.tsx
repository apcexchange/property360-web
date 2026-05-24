"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, Check, Clock, X } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  StatusPill,
} from "@/components/app/ui";
import { tenantApi, KycStatus } from "@/lib/tenant-api";

const ID_TYPES = [
  { value: "nin", label: "NIN (National Identity Number)" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "International Passport" },
  { value: "voters_card", label: "Voter's Card" },
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

export default function TenantKycPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["me", "kyc-status"],
    queryFn: () => tenantApi.kycStatus(),
  });

  return (
    <>
      <TenantTopbar
        title="Identity verification"
        subtitle="Helps landlords trust you for new lease offers"
        actions={
          <Link
            href="/me/profile"
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

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SelfieCard
                status={q.data!.selfieStatus}
                onUpload={(file) =>
                  tenantApi.uploadKycSelfie(file).then(() => {
                    qc.invalidateQueries({ queryKey: ["me", "kyc-status"] });
                  })
                }
              />
              <DocumentCard
                status={q.data!.documentStatus}
                onUpload={(file, type, num) =>
                  tenantApi
                    .uploadKycDocument(file, type, num)
                    .then(() =>
                      qc.invalidateQueries({ queryKey: ["me", "kyc-status"] })
                    )
                }
              />
            </div>
          </>
        )}
      </PageContainer>
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
  onUpload: (f: File, type: string, num: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(ID_TYPES[0].value);
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          disabled={status === "pending" || status === "approved"}
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
          disabled={status === "pending" || status === "approved"}
          className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 disabled:opacity-50"
        />
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={
          !num.trim() || busy || status === "pending" || status === "approved"
        }
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
            await onUpload(f, type, num.trim());
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
