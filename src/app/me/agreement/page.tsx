"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, FileSignature, Download } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  EmptyState,
  formatDate,
} from "@/components/app/ui";
import { tenantApi, TenancyAgreement } from "@/lib/tenant-api";

export default function AgreementPage() {
  const dash = useQuery({
    queryKey: ["me", "dashboard"],
    queryFn: () => tenantApi.getDashboard(),
  });

  const leaseId = dash.data?.lease.id;

  const agreements = useQuery({
    queryKey: ["me", "agreements", leaseId],
    queryFn: () => tenantApi.listAgreementsByLease(leaseId!),
    enabled: !!leaseId,
  });

  return (
    <>
      <TenantTopbar
        title="Tenancy agreement"
        subtitle="Review and sign the document for your lease"
      />
      <PageContainer>
        {dash.isLoading || (leaseId && agreements.isLoading) ? (
          <Card className="p-5">
            <Skeleton className="h-64 w-full" />
          </Card>
        ) : !dash.data ? (
          <EmptyState
            title="No active lease"
            body="Once you have a lease, the tenancy agreement will appear here."
          />
        ) : agreements.isError ? (
          <ErrorBox
            message={(agreements.error as Error)?.message}
            onRetry={() => agreements.refetch()}
          />
        ) : (agreements.data ?? []).length === 0 ? (
          <EmptyState
            title="No agreement uploaded yet"
            body="When your landlord uploads the tenancy agreement, it appears here for you to read and sign."
          />
        ) : (
          <div className="space-y-6">
            {agreements.data!.map((a) => (
              <AgreementCard key={a._id} agreement={a} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function AgreementCard({ agreement }: { agreement: TenancyAgreement }) {
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const sign = useMutation({
    mutationFn: () => tenantApi.getAgreementSigningLink(agreement._id),
    onSuccess: (res) => {
      if (!res?.url) {
        setError("No signing link was returned.");
        return;
      }
      setEmbedUrl(res.url);
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err as Error).message ??
          "Couldn't load signing link"
      );
    },
  });

  const tone: "good" | "warn" | "neutral" =
    agreement.status === "signed"
      ? "good"
      : agreement.status === "sent_for_signing"
      ? "warn"
      : "neutral";

  const fileUrl =
    agreement.signedDocumentUrl ??
    agreement.documentUrl ??
    agreement.fileUrl ??
    null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foundation-700/10 p-5">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Tenancy agreement
          </p>
          <p className="mt-1 font-display text-[18px] font-extrabold text-foundation-700">
            {agreement.fileName ?? "Lease document"}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            Uploaded {formatDate(agreement.createdAt)}
            {agreement.signedAt
              ? ` · Signed ${formatDate(agreement.signedAt)}`
              : ""}
          </p>
        </div>
        <StatusPill label={agreement.status} tone={tone} />
      </div>

      {fileUrl && (
        <div className="border-b border-foundation-700/10 bg-foundation-700/5 p-4">
          <iframe
            src={fileUrl}
            title="Tenancy agreement preview"
            className="h-[60vh] w-full rounded-lg border border-foundation-700/10 bg-paper"
          />
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            <Download className="h-3.5 w-3.5" /> Open document in a new tab
          </a>
        </div>
      )}

      {embedUrl && (
        <div className="border-b border-foundation-700/10 bg-foundation-700/5 p-4">
          <p className="mb-2 text-[12.5px] font-semibold text-foundation-700">
            Signing portal
          </p>
          <iframe
            src={embedUrl}
            title="Signing portal"
            className="h-[70vh] w-full rounded-lg border border-foundation-700/10 bg-paper"
          />
          <a
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in a new tab
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        {error && (
          <p className="text-[12.5px] text-red-700">{error}</p>
        )}
        {agreement.status !== "signed" && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              sign.mutate();
            }}
            disabled={sign.isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            <FileSignature className="h-4 w-4" />{" "}
            {sign.isPending
              ? "Preparing link…"
              : embedUrl
              ? "Reopen signing"
              : "Sign agreement"}
          </button>
        )}
      </div>
    </Card>
  );
}
