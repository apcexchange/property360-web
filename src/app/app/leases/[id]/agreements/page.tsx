"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  FileText,
  ExternalLink,
  Send,
} from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, TenancyAgreement } from "@/lib/landlord-api";

const STATUS_TONE: Record<
  TenancyAgreement["status"],
  "good" | "warn" | "neutral" | "info"
> = {
  draft: "neutral",
  sent_for_signing: "info",
  signed: "good",
  cancelled: "warn",
};

export default function AgreementsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);

  const list = useQuery({
    queryKey: ["agreements", id],
    queryFn: () => landlordApi.agreementsByLease(id),
    enabled: !!id,
  });

  const upload = useMutation({
    mutationFn: (file: File) => landlordApi.uploadAgreement(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements", id] }),
  });

  // Templates the landlord has saved for this property (or any of their
  // properties — the picker shows them all so they can grab a sister
  // property's template if needed).
  const propertyId = row?.property?.id;
  const templates = useQuery({
    queryKey: ["agreement-templates", "for-lease", propertyId ?? "all"],
    queryFn: () => landlordApi.listAgreementTemplates(propertyId),
    enabled: !!row,
  });
  const sendTemplate = useMutation({
    mutationFn: (templateId: string) =>
      landlordApi.sendAgreementTemplateToTenant(templateId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements", id] }),
  });
  const [picking, setPicking] = useState(false);

  function pickFile() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    upload.mutate(file, {
      onError: (err) => {
        const ax = err as AxiosError<{ message?: string }>;
        setUploadError(
          ax.response?.data?.message ?? (err as Error).message ?? "Upload failed"
        );
      },
    });
    e.target.value = "";
  }

  return (
    <>
      <AppTopbar
        title="Tenancy agreements"
        subtitle={
          row
            ? `${row.tenant.firstName} ${row.tenant.lastName} · ${row.property.name}, Unit ${row.unit.unitNumber}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/app/leases/${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              type="button"
              onClick={() => setPicking(true)}
              disabled={!templates.data || templates.data.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-40"
              title={
                templates.data && templates.data.length > 0
                  ? "Send a saved template"
                  : "Create a template under the property to enable this"
              }
            >
              <Send className="h-4 w-4" /> Send template
            </button>
            <button
              type="button"
              onClick={pickFile}
              disabled={upload.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />{" "}
              {upload.isPending ? "Uploading…" : "Upload PDF"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFile}
            />
          </div>
        }
      />
      <PageContainer>
        {uploadError && (
          <div className="mb-6">
            <ErrorBox message={uploadError} />
          </div>
        )}
        {list.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </Card>
        ) : list.isError ? (
          <ErrorBox
            message={(list.error as Error)?.message}
            onRetry={() => list.refetch()}
          />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState
            title="No agreements"
            body="Upload a tenancy agreement PDF. The tenant will see it on their Property360 dashboard and sign it in-app (checkbox + typed name)."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {list.data!.map((a) => {
              const signed = a.tenantAcknowledged || a.status === "signed";
              const displayStatus = signed ? "signed" : "awaiting tenant";
              const tone: "good" | "warn" | "neutral" | "info" = signed
                ? "good"
                : STATUS_TONE[a.status] ?? "warn";
              const signedDate = a.tenantAcknowledgedAt ?? a.signedAt;
              return (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-foundation-700" />
                      <p className="truncate text-[14px] font-semibold text-foundation-700">
                        {a.fileName ?? "Tenancy agreement"}
                      </p>
                      <StatusPill label={displayStatus} tone={tone} />
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-muted">
                      Uploaded {formatDate(a.createdAt)}
                      {signedDate && ` · Signed ${formatDate(signedDate)}`}
                      {signed && a.signedTypedName && ` by ${a.signedTypedName}`}
                    </p>
                  </div>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                </div>
              );
            })}
          </Card>
        )}

        {picking && (
          <TemplatePickerModal
            templates={templates.data ?? []}
            sending={sendTemplate.isPending}
            onPick={(tId) => sendTemplate.mutate(tId)}
            onClose={() => setPicking(false)}
          />
        )}
      </PageContainer>
    </>
  );
}

function TemplatePickerModal({
  templates,
  sending,
  onPick,
  onClose,
}: {
  templates: import("@/lib/landlord-api").AgreementTemplate[];
  sending: boolean;
  onPick: (templateId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Send template to tenant
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold text-foundation-700 hover:underline"
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-[13px] text-ink-muted">
          A copy of the template will be created on this lease with the
          tenant's details substituted. Their name will be attached to the
          PDF.
        </p>
        <div className="mt-4 max-h-[60vh] divide-y divide-foundation-700/10 overflow-y-auto">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">
              No templates saved yet for this property.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t._id}
                type="button"
                disabled={sending}
                onClick={() => onPick(t._id)}
                className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition hover:bg-foundation-700/5 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foundation-700">
                    {t.name}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {t.source === "text" ? "Editable text" : "Uploaded file"}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <Send className="h-4 w-4 text-foundation-700" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
