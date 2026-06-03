"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Upload as UploadIcon } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  QUIT_NOTICE_REASON_LABELS,
  QuitNoticeReason,
} from "@/lib/landlord-api";
import { PageErrorBoundary } from "@/components/app/PageErrorBoundary";
import { useToast } from "@/components/ui/Toast";

type Mode = "template" | "upload";

const DEFAULT_PERIODS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  annually: 180,
};

export default function NewQuitNoticePage() {
  return (
    <PageErrorBoundary name="New quit notice">
      <NewQuitNoticeInner />
    </PageErrorBoundary>
  );
}

function NewQuitNoticeInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);
  const lease = row?.lease;

  const [mode, setMode] = useState<Mode>("template");
  const [reason, setReason] = useState<QuitNoticeReason>("end_of_term");
  const [reasonDetail, setReasonDetail] = useState("");
  const [period, setPeriod] = useState<number | "">("");
  const [body, setBody] = useState("");
  // Goes true the moment the user types into the body textarea — once
  // they've made custom edits we stop overwriting them.
  const [bodyManuallyEdited, setBodyManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const defaultPeriod =
    DEFAULT_PERIODS[lease?.paymentFrequency ?? "monthly"] ?? 30;
  const effectivePeriod = period === "" ? defaultPeriod : Number(period);
  const tenantName = row
    ? `${row.tenant.firstName} ${row.tenant.lastName}`.trim()
    : "the tenant";
  const propertyLine = row
    ? `${row.property.name}${row.unit.unitNumber ? `, Unit ${row.unit.unitNumber}` : ""}`
    : "the premises";

  function buildTemplateBody(): string {
    const expiryDate = new Date(
      Date.now() + effectivePeriod * 24 * 60 * 60 * 1000
    );
    const expiryLine = formatDate(expiryDate.toISOString());
    const reasonText = QUIT_NOTICE_REASON_LABELS[reason];
    return (
      `Dear ${tenantName},\n\n` +
      `Take notice that I, the landlord of ${propertyLine}, hereby require ` +
      `you to deliver up possession of the premises which you hold of me as my tenant ` +
      `on or before ${expiryLine}.\n\n` +
      `This notice is issued on the following grounds: ${reasonText}.\n\n` +
      (reasonDetail.trim() ? `Further details: ${reasonDetail.trim()}\n\n` : "") +
      `Failure to deliver up possession on the date specified may result in the ` +
      `commencement of recovery-of-premises proceedings in accordance with the law.\n\n` +
      `Yours faithfully,\nThe Landlord`
    );
  }

  function autofillTemplate() {
    setBody(buildTemplateBody());
    setBodyManuallyEdited(false);
  }

  // Auto-refresh the suggested body whenever the reason / detail /
  // period changes, until the user has typed their own edits into the
  // body. Without this, changing reasonDetail after a first auto-fill
  // would silently leave "Other" in the body with no further details.
  useEffect(() => {
    if (mode !== "template" || bodyManuallyEdited || !row) return;
    setBody(buildTemplateBody());
    // buildTemplateBody is a stable closure over the same deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    reason,
    reasonDetail,
    effectivePeriod,
    tenantName,
    propertyLine,
    row,
    bodyManuallyEdited,
  ]);

  const issueTemplate = useMutation({
    mutationFn: () =>
      landlordApi.issueQuitNoticeFromTemplate({
        leaseId: id,
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
        noticePeriodDays: period === "" ? undefined : Number(period),
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quit-notices", id] });
      toast.success("Notice served");
      router.push(`/app/leases/${id}`);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Failed to serve"
      );
    },
  });

  const issueUpload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Pick a document to upload");
      return landlordApi.issueQuitNoticeFromUpload(id, file, {
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
        noticePeriodDays: period === "" ? undefined : Number(period),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quit-notices", id] });
      toast.success("Notice served");
      router.push(`/app/leases/${id}`);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Upload failed"
      );
    },
  });

  const reasonNeedsDetail = reason === "other";
  const canIssue =
    mode === "template"
      ? body.trim().length >= 30 &&
        (!reasonNeedsDetail || reasonDetail.trim().length > 0)
      : !!file &&
        (!reasonNeedsDetail || reasonDetail.trim().length > 0);

  return (
    <>
      <AppTopbar
        title="Serve quit notice"
        subtitle={row ? `${tenantName} · ${propertyLine}` : undefined}
        actions={
          <Link
            href={`/app/leases/${id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {occupied.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </Card>
        ) : !lease ? (
          <ErrorBox message="Lease not found." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-5 flex items-center gap-2 rounded-full bg-foundation-700/5 p-1 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("template")}
                  className={`flex-1 rounded-full px-3 py-1.5 transition ${
                    mode === "template"
                      ? "bg-foundation-700 text-paper"
                      : "text-foundation-700"
                  }`}
                >
                  <FileText className="mr-1.5 inline h-3.5 w-3.5" /> Use template
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`flex-1 rounded-full px-3 py-1.5 transition ${
                    mode === "upload"
                      ? "bg-foundation-700 text-paper"
                      : "text-foundation-700"
                  }`}
                >
                  <UploadIcon className="mr-1.5 inline h-3.5 w-3.5" /> Upload document
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Reason">
                  <Select
                    value={reason}
                    onChange={(v) => setReason(v as QuitNoticeReason)}
                    options={(
                      Object.keys(QUIT_NOTICE_REASON_LABELS) as QuitNoticeReason[]
                    ).map((r) => ({
                      value: r,
                      label: QUIT_NOTICE_REASON_LABELS[r],
                    }))}
                  />
                </Field>
                <Field
                  label={`Notice period (default ${defaultPeriod} days)`}
                  hint={`Auto-derived from the ${lease.paymentFrequency} rent frequency.`}
                >
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={period}
                    onChange={(e) =>
                      setPeriod(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder={String(defaultPeriod)}
                    className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                  />
                </Field>
                {reasonNeedsDetail && (
                  <Field label="Reason detail" className="sm:col-span-2">
                    <textarea
                      value={reasonDetail}
                      onChange={(e) => setReasonDetail(e.target.value)}
                      rows={2}
                      placeholder="Explain the specific grounds for this notice."
                      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                    />
                  </Field>
                )}
              </div>

              {mode === "template" ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                      Notice body
                    </label>
                    <button
                      type="button"
                      onClick={autofillTemplate}
                      className="text-[11.5px] font-semibold text-foundation-700 hover:underline"
                    >
                      Use suggested template
                    </button>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setBodyManuallyEdited(true);
                    }}
                    rows={14}
                    placeholder={`Take notice that I, the landlord of …, hereby require you to deliver up possession of the premises …`}
                    className="w-full rounded-xl border border-foundation-700/15 bg-paper p-4 font-mono text-[12.5px] leading-relaxed text-foundation-700"
                  />
                  <p className="mt-2 text-[11.5px] text-ink-muted">
                    Minimum 30 characters. This becomes the body of the served PDF.
                    {bodyManuallyEdited && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={autofillTemplate}
                          className="font-semibold text-foundation-700 underline hover:no-underline"
                        >
                          Reset to suggested template
                        </button>
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                    Upload document
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foundation-700/20 bg-foundation-700/5 px-4 py-8 text-center transition hover:bg-foundation-700/10"
                  >
                    <UploadIcon className="h-5 w-5 text-foundation-700" />
                    {file ? (
                      <>
                        <p className="text-[13px] font-semibold text-foundation-700">
                          {file.name}
                        </p>
                        <p className="text-[11.5px] text-ink-muted">
                          {(file.size / 1024).toFixed(1)} KB · click to pick a different file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-semibold text-foundation-700">
                          Choose a PDF, DOCX, or image
                        </p>
                        <p className="text-[11.5px] text-ink-muted">
                          Use this for a court order or a notice you've drafted elsewhere.
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.docx,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {error && (
                <div className="mt-4">
                  <ErrorBox message={error} />
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <Link
                  href={`/app/leases/${id}`}
                  className="rounded-full border border-foundation-700/15 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  disabled={
                    !canIssue ||
                    issueTemplate.isPending ||
                    issueUpload.isPending
                  }
                  onClick={() => {
                    setError(null);
                    if (mode === "template") issueTemplate.mutate();
                    else issueUpload.mutate();
                  }}
                  className="rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
                >
                  {issueTemplate.isPending || issueUpload.isPending
                    ? "Serving…"
                    : "Serve notice"}
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Effective dates
              </p>
              <dl className="mt-3 space-y-3 text-[13px]">
                <div>
                  <dt className="text-ink-muted">Issued on</dt>
                  <dd className="font-semibold text-foundation-700">
                    {formatDate(new Date().toISOString())}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Tenant has</dt>
                  <dd className="font-semibold text-foundation-700">
                    {effectivePeriod} day{effectivePeriod === 1 ? "" : "s"} to vacate
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Expires on</dt>
                  <dd className="font-semibold text-foundation-700">
                    {formatDate(
                      new Date(
                        Date.now() + effectivePeriod * 24 * 60 * 60 * 1000
                      ).toISOString()
                    )}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[11.5px] leading-relaxed text-ink-muted">
                A PDF copy of this notice will be saved against the lease and
                emailed to {tenantName}. They will also see it in their tenant
                dashboard.
              </p>
            </Card>
          </div>
        )}
      </PageContainer>
    </>
  );
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      )}
    </div>
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
      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
