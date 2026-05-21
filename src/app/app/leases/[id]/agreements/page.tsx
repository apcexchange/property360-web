"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  FileText,
  Send,
  ExternalLink,
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
  const row = occupied.data?.find((r) => r.lease?._id === id);

  const list = useQuery({
    queryKey: ["agreements", id],
    queryFn: () => landlordApi.agreementsByLease(id),
    enabled: !!id,
  });

  const upload = useMutation({
    mutationFn: (file: File) => landlordApi.uploadAgreement(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements", id] }),
  });
  const sendForSigning = useMutation({
    mutationFn: (agreementId: string) =>
      landlordApi.sendAgreementForSigning(agreementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agreements", id] }),
  });

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
            body="Upload a PDF tenancy agreement and send it to the tenant for signing via DocuSeal."
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {list.data!.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-foundation-700" />
                    <p className="truncate text-[14px] font-semibold text-foundation-700">
                      {a.fileName ?? "Tenancy agreement"}
                    </p>
                    <StatusPill
                      label={a.status.replace(/_/g, " ")}
                      tone={STATUS_TONE[a.status]}
                    />
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    Uploaded {formatDate(a.createdAt)}
                    {a.signedAt && ` · Signed ${formatDate(a.signedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                  {a.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => sendForSigning.mutate(a._id)}
                      disabled={sendForSigning.isPending}
                      className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" /> Send for signing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}
