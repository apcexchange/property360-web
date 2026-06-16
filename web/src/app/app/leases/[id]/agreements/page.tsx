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
  FileSignature,
  Download,
  Sparkles,
  X,
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
import {
  landlordApi,
  TenancyAgreement,
  PaymentFrequency,
} from "@/lib/landlord-api";
import { session } from "@/lib/session";
import { SignatureCapture } from "@/components/SignatureCapture";
import { useToast } from "@/components/ui/Toast";

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
  const [aiOpen, setAiOpen] = useState(false);
  const [signingAgreement, setSigningAgreement] =
    useState<TenancyAgreement | null>(null);

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
              onClick={() => setAiOpen(true)}
              disabled={!row}
              className="inline-flex items-center gap-1.5 rounded-full border border-cryola-400 bg-cryola-200/50 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-cryola-200 disabled:opacity-40"
              title="Draft a tenancy agreement with AI, then issue it to this tenant"
            >
              <Sparkles className="h-4 w-4" /> Generate with AI
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
              const tenantSigned = a.tenantAcknowledged || a.status === "signed";
              const landlordSigned = !!a.landlordSignedAt;
              const fullySigned = tenantSigned && landlordSigned;
              const displayStatus = fullySigned
                ? "signed by both"
                : tenantSigned
                ? "awaiting landlord"
                : landlordSigned
                ? "awaiting tenant"
                : "awaiting tenant";
              const tone: "good" | "warn" | "neutral" | "info" = fullySigned
                ? "good"
                : tenantSigned || landlordSigned
                ? "info"
                : STATUS_TONE[a.status] ?? "warn";
              const signedDate = a.tenantAcknowledgedAt ?? a.signedAt;
              return (
                <div
                  key={a._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
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
                      {signedDate &&
                        ` · Tenant signed ${formatDate(signedDate)}${
                          a.signedTypedName ? ` (${a.signedTypedName})` : ""
                        }`}
                      {landlordSigned &&
                        ` · Landlord signed ${formatDate(
                          a.landlordSignedAt as string
                        )}${
                          a.landlordSignedName
                            ? ` (${a.landlordSignedName})`
                            : ""
                        }`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.signedDocumentUrl && (
                      <a
                        href={a.signedDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Download className="h-3 w-3" /> Signed copy
                      </a>
                    )}
                    {!landlordSigned && (
                      <button
                        type="button"
                        onClick={() => setSigningAgreement(a)}
                        className="inline-flex items-center gap-1 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800"
                      >
                        <FileSignature className="h-3 w-3" /> Sign as landlord
                      </button>
                    )}
                    <a
                      href={a.fileUrl ?? a.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                  </div>
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

        {aiOpen && row && (
          <AiAgreementModal
            leaseId={id}
            tenantName={`${row.tenant.firstName} ${row.tenant.lastName}`.trim()}
            rentNgn={row.lease?.rentAmount}
            paymentFrequency={row.lease?.paymentFrequency}
            jurisdiction={
              [row.property.address?.city, row.property.address?.state]
                .filter(Boolean)
                .join(", ") || undefined
            }
            onClose={() => setAiOpen(false)}
            onIssued={() => {
              setAiOpen(false);
              qc.invalidateQueries({ queryKey: ["agreements", id] });
            }}
          />
        )}

        {signingAgreement && (
          <LandlordSignModal
            agreement={signingAgreement}
            onClose={() => setSigningAgreement(null)}
            onSigned={() => {
              setSigningAgreement(null);
              qc.invalidateQueries({ queryKey: ["agreements", id] });
            }}
          />
        )}
      </PageContainer>
    </>
  );
}

function AiAgreementModal({
  leaseId,
  tenantName,
  rentNgn,
  paymentFrequency,
  jurisdiction,
  onClose,
  onIssued,
}: {
  leaseId: string;
  tenantName: string;
  rentNgn?: number;
  paymentFrequency?: PaymentFrequency;
  jurisdiction?: string;
  onClose: () => void;
  onIssued: () => void;
}) {
  const toast = useToast();
  const [propertyType, setPropertyType] = useState("residential apartment");
  const [specialClauses, setSpecialClauses] = useState("");
  const [draft, setDraft] = useState("");
  const [instructions, setInstructions] = useState("");
  const [title, setTitle] = useState("Tenancy Agreement");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const errMsg = (err: unknown) => {
    const ax = err as AxiosError<{ message?: string }>;
    return (
      ax.response?.data?.message ??
      (err as Error).message ??
      "Something went wrong"
    );
  };

  const generate = useMutation({
    mutationFn: () =>
      landlordApi.aiGenerateAgreement({
        propertyType: propertyType.trim() || undefined,
        rentNgn,
        paymentFrequency,
        jurisdiction,
        specialClauses: specialClauses.trim() || undefined,
      }),
    onSuccess: (res) => {
      setDraft(res.body);
      setError(null);
    },
    onError: (err) => setError(errMsg(err)),
  });

  const refine = useMutation({
    mutationFn: () =>
      landlordApi.aiRefineAgreement({
        body: draft,
        instructions: instructions.trim() || undefined,
      }),
    onSuccess: (res) => {
      setDraft(res.body);
      setInstructions("");
      setError(null);
    },
    onError: (err) => setError(errMsg(err)),
  });

  const issue = useMutation({
    mutationFn: () =>
      landlordApi.issueAgreementFromText({
        leaseId,
        body: draft,
        title: title.trim() || undefined,
        saveAsTemplate,
        templateName: saveAsTemplate
          ? templateName.trim() || undefined
          : undefined,
      }),
    onSuccess: () => {
      toast.success("Agreement issued to tenant");
      onIssued();
    },
    onError: (err) => setError(errMsg(err)),
  });

  const busy = generate.isPending || refine.isPending || issue.isPending;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-700/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-paper shadow-xl">
        <div className="flex items-start justify-between border-b border-foundation-700/10 p-5">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <Sparkles className="h-3.5 w-3.5" /> AI agreement
            </p>
            <p className="mt-1 font-display text-[18px] font-extrabold text-foundation-700">
              Draft for {tenantName}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Pre-filled from this lease
              {rentNgn ? ` · rent ₦${rentNgn.toLocaleString("en-NG")}` : ""}
              {paymentFrequency ? ` · ${paymentFrequency}` : ""}
              {jurisdiction ? ` · ${jurisdiction}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!draft ? (
            <>
              <Field label="Property type">
                <input
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  placeholder="e.g. residential apartment, shop, duplex"
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
              </Field>
              <Field label="Special clauses (optional)">
                <textarea
                  value={specialClauses}
                  onChange={(e) => setSpecialClauses(e.target.value)}
                  rows={4}
                  placeholder="e.g. No subletting. Tenant covers electricity. 2 months' notice to quit."
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13.5px] text-foundation-700"
                />
              </Field>
              <p className="text-[12px] text-ink-muted">
                The draft uses Nigerian tenancy conventions and placeholders for
                names, property and unit. You can edit everything before
                issuing. Drafting can take 15–40 seconds.
              </p>
            </>
          ) : (
            <>
              <Field label="Document title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
              </Field>
              <Field label="Agreement draft (editable)">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={14}
                  className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed text-foundation-700"
                />
              </Field>
              <Field label="Refine with AI (optional)">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. add a break clause, make the rent annual"
                    className="flex-1 rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13.5px] text-foundation-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      refine.mutate();
                    }}
                    disabled={busy || !draft.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-foundation-700/15 bg-paper px-4 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {refine.isPending ? "Refining…" : "Refine"}
                  </button>
                </div>
              </Field>
              <label className="flex items-start gap-2.5 rounded-xl bg-foundation-700/5 p-3">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-[12.5px] text-foundation-700">
                  Also save this as a reusable template for the property
                  {saveAsTemplate && (
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (defaults to the title)"
                      className="mt-2 w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                    />
                  )}
                </span>
              </label>
            </>
          )}

          {error && <p className="text-[12.5px] text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-foundation-700/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            Cancel
          </button>
          {!draft ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                generate.mutate();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generate.isPending ? "Drafting…" : "Generate draft"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  generate.mutate();
                }}
                disabled={busy}
                className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
              >
                {generate.isPending ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  issue.mutate();
                }}
                disabled={busy || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {issue.isPending ? "Issuing…" : "Issue to tenant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LandlordSignModal({
  agreement,
  onClose,
  onSigned,
}: {
  agreement: TenancyAgreement;
  onClose: () => void;
  onSigned: () => void;
}) {
  const toast = useToast();
  const [hasReviewed, setHasReviewed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<
    "uploaded" | "drawn" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const user = session.getUser();
  const expectedName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim().toLowerCase()
    : "";
  const trimmedTyped = typedName.trim();
  const namesMatch =
    !expectedName || trimmedTyped.toLowerCase() === expectedName;

  const documentHash = [
    agreement._id,
    agreement.documentPublicId ?? "",
    agreement.fileSize ?? "",
  ].join("|");

  const sign = useMutation({
    mutationFn: () =>
      landlordApi.landlordSignAgreement(agreement._id, {
        typedName: trimmedTyped,
        documentHash,
        signatureImage: signatureBlob,
        signatureMethod: signatureMethod ?? undefined,
      }),
    onSuccess: () => {
      toast.success("Agreement signed");
      onSigned();
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

  const canSign =
    hasReviewed &&
    trimmedTyped.length >= 2 &&
    namesMatch &&
    documentHash.length >= 8;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-foundation-700/10 p-5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Sign as landlord
            </p>
            <p className="mt-1 font-display text-[18px] font-extrabold text-foundation-700">
              {agreement.fileName ?? "Tenancy agreement"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-foundation-700/5 hover:text-foundation-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <a
            href={agreement.signedDocumentUrl ?? agreement.documentUrl ?? agreement.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[12px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open the document
          </a>

          <label className="flex items-start gap-2.5 text-[13px] text-foundation-700">
            <input
              type="checkbox"
              checked={hasReviewed}
              onChange={(e) => setHasReviewed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-foundation-700"
            />
            <span>
              I have read this tenancy agreement and I agree to its terms as
              the landlord.
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

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Signature (optional)
            </label>
            <SignatureCapture
              onChange={(blob, method) => {
                setSignatureBlob(blob);
                setSignatureMethod(method);
              }}
            />
            <p className="mt-1 text-[11.5px] text-ink-muted">
              Drawn or uploaded signature appears on the signed copy.
            </p>
          </div>

          {error && (
            <p className="text-[12.5px] text-red-700">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foundation-700/15 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                sign.mutate();
              }}
              disabled={!canSign || sign.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
            >
              <FileSignature className="h-4 w-4" />
              {sign.isPending ? "Signing…" : "Sign agreement"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
