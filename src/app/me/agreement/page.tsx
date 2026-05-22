"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Download, CheckCircle2 } from "lucide-react";
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
import { session } from "@/lib/session";
import { useToast } from "@/components/ui/Toast";

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
  const qc = useQueryClient();
  const toast = useToast();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const user = session.getUser();
  const expectedName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim().toLowerCase()
    : "";
  const trimmedTyped = typedName.trim();
  const namesMatch =
    !expectedName || trimmedTyped.toLowerCase() === expectedName;

  // Match mobile's hash convention so the same record can be verified
  // regardless of which client signed it.
  const documentHash = useMemo(() => {
    const parts = [
      agreement._id,
      agreement.documentPublicId ?? "",
      agreement.fileSize ?? "",
    ];
    return parts.join("|");
  }, [agreement]);

  const sign = useMutation({
    mutationFn: () =>
      tenantApi.acknowledgeAgreement(agreement._id, {
        typedName: trimmedTyped,
        documentHash,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "agreements"] });
      toast.success("Agreement signed");
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ??
          (err as Error).message ??
          "Couldn't sign agreement"
      );
    },
  });

  const isSigned =
    agreement.status === "signed" || agreement.tenantAcknowledged;
  const tone: "good" | "warn" | "neutral" = isSigned
    ? "good"
    : agreement.status === "sent_for_signing"
    ? "warn"
    : "neutral";

  const fileUrl =
    agreement.signedDocumentUrl ??
    agreement.documentUrl ??
    agreement.fileUrl ??
    null;

  const canSign =
    !isSigned &&
    hasReviewed &&
    trimmedTyped.length >= 2 &&
    namesMatch &&
    documentHash.length >= 8;

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
        <StatusPill label={isSigned ? "signed" : agreement.status} tone={tone} />
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

      {isSigned ? (
        <div className="flex items-center gap-2 p-5 text-[13px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          You signed this agreement
          {agreement.signedAt || agreement.acknowledgedAt
            ? ` on ${formatDate(
                agreement.signedAt ?? agreement.acknowledgedAt
              )}`
            : ""}
          .
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <label className="flex items-start gap-2.5 text-[13px] text-foundation-700">
            <input
              type="checkbox"
              checked={hasReviewed}
              onChange={(e) => setHasReviewed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-foundation-700"
            />
            <span>
              I have read this tenancy agreement and I agree to its terms.
            </span>
          </label>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Type your full legal name to sign
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={
                user ? `${user.firstName} ${user.lastName}` : "Your full name"
              }
              className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[14px] text-foundation-700"
            />
            {trimmedTyped.length > 0 && !namesMatch && (
              <p className="mt-1 text-[11.5px] text-red-700">
                The name must match your registered name on Property360.
              </p>
            )}
          </div>

          {error && (
            <p className="text-[12.5px] text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={() => {
              setError(null);
              sign.mutate();
            }}
            disabled={!canSign || sign.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            <FileSignature className="h-4 w-4" />
            {sign.isPending ? "Signing…" : "Sign agreement"}
          </button>
        </div>
      )}
    </Card>
  );
}
