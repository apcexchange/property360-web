"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
  Wand2,
} from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  EmptyState,
  StatusPill,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  AgreementTemplate,
} from "@/lib/landlord-api";
import { PageErrorBoundary } from "@/components/app/PageErrorBoundary";
import { useToast } from "@/components/ui/Toast";

export default function AgreementTemplatesPage() {
  return (
    <PageErrorBoundary name="Agreement templates">
      <Inner />
    </PageErrorBoundary>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const property = useQuery({
    queryKey: ["property", id],
    queryFn: () => landlordApi.getProperty(id),
    enabled: !!id,
  });
  const templates = useQuery({
    queryKey: ["agreement-templates", id],
    queryFn: () => landlordApi.listAgreementTemplates(id),
    enabled: !!id,
  });

  const propName = property.data?.property?.name;
  const [editing, setEditing] = useState<AgreementTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <AppTopbar
        title="Agreement templates"
        subtitle={propName}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/app/properties/${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper hover:bg-foundation-800"
            >
              <Plus className="h-4 w-4" /> New template
            </button>
          </div>
        }
      />
      <PageContainer>
        {(creating || editing) && (
          <TemplateEditor
            propertyId={id}
            initial={editing}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}

        {templates.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : templates.isError ? (
          <ErrorBox
            message={(templates.error as Error)?.message}
            onRetry={() => templates.refetch()}
          />
        ) : (templates.data ?? []).length === 0 && !creating && !editing ? (
          <EmptyState
            title="No templates yet"
            body="Save a template once per property — then send a copy to a tenant in one click. Property360's AI can generate a sample for you or polish one you've typed."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.data!.map((t) => (
              <TemplateCard
                key={t._id}
                template={t}
                onEdit={() => {
                  setCreating(false);
                  setEditing(t);
                }}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: AgreementTemplate;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const del = useMutation({
    mutationFn: () => landlordApi.deleteAgreementTemplate(template._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-templates"] });
      toast.success("Template deleted");
    },
  });
  const isText = template.source === "text";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-foundation-700" />
            <p className="truncate font-display text-[16px] font-extrabold text-foundation-700">
              {template.name}
            </p>
            <StatusPill
              label={isText ? "Editable" : "Uploaded"}
              tone={isText ? "info" : "neutral"}
            />
          </div>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            Saved {formatDate(template.createdAt)} · revision{" "}
            {template.revision}
          </p>
          {template.notes && (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              {template.notes}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this template?")) del.mutate();
          }}
          className="rounded-full border border-red-200 bg-paper p-1.5 text-red-600 transition hover:bg-red-50"
          aria-label="Delete template"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {isText ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
          >
            Open editor
          </button>
        ) : template.documentUrl ? (
          <a
            href={template.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
          >
            Open file
          </a>
        ) : null}
      </div>
    </Card>
  );
}

function TemplateEditor({
  propertyId,
  initial,
  onClose,
}: {
  propertyId: string;
  initial: AgreementTemplate | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!initial;
  const isTextEdit = isEdit && initial!.source === "text";

  const [mode, setMode] = useState<"text" | "upload">(
    isEdit ? (initial!.source === "text" ? "text" : "upload") : "text"
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [bodyText, setBodyText] = useState(initial?.body ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  // AI controls
  const [showAi, setShowAi] = useState(false);
  const [aiPropertyType, setAiPropertyType] = useState("apartment");
  const [aiRent, setAiRent] = useState("");
  const [aiFrequency, setAiFrequency] =
    useState<"monthly" | "quarterly" | "annually">("annually");
  const [aiJurisdiction, setAiJurisdiction] = useState("");
  const [aiSpecialClauses, setAiSpecialClauses] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");

  const create = useMutation({
    mutationFn: () =>
      landlordApi.createTextAgreementTemplate({
        propertyId,
        name,
        body: bodyText,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-templates"] });
      toast.success("Template created");
      onClose();
    },
    onError: (err) => toastErr(err, toast),
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Pick a file to upload");
      return landlordApi.uploadAgreementTemplate(
        propertyId,
        name,
        file,
        notes.trim() || undefined
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-templates"] });
      toast.success("Template uploaded");
      onClose();
    },
    onError: (err) => toastErr(err, toast),
  });

  const update = useMutation({
    mutationFn: () =>
      landlordApi.updateTextAgreementTemplate(initial!._id, {
        name,
        body: bodyText,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agreement-templates"] });
      toast.success("Template updated");
      onClose();
    },
    onError: (err) => toastErr(err, toast),
  });

  const aiGen = useMutation({
    mutationFn: () =>
      landlordApi.aiGenerateAgreement({
        propertyType: aiPropertyType,
        rentNgn: aiRent ? Number(aiRent) : undefined,
        paymentFrequency: aiFrequency,
        jurisdiction: aiJurisdiction || undefined,
        specialClauses: aiSpecialClauses || undefined,
      }),
    onSuccess: (res) => {
      setBodyText(res.body);
      toast.success("Draft generated. Review and edit before saving.");
    },
    onError: (err) => toastErr(err, toast),
  });

  const aiRefine = useMutation({
    mutationFn: () =>
      landlordApi.aiRefineAgreement({
        body: bodyText,
        instructions: aiInstructions || undefined,
      }),
    onSuccess: (res) => {
      setBodyText(res.body);
      toast.success("Refined. Review the changes before saving.");
    },
    onError: (err) => toastErr(err, toast),
  });

  const saveDisabled =
    mode === "text"
      ? !name.trim() || bodyText.trim().length < 30
      : !name.trim() || (!isEdit && !file);

  const aiBusy = aiGen.isPending || aiRefine.isPending;

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {isEdit ? "Edit template" : "New template"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] font-semibold text-foundation-700 hover:underline"
        >
          Close
        </button>
      </div>

      {!isEdit && (
        <div className="mt-4 flex gap-2 rounded-full bg-foundation-700/5 p-1 text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              mode === "text"
                ? "bg-foundation-700 text-paper"
                : "text-foundation-700"
            }`}
          >
            <FileText className="mr-1.5 inline h-3.5 w-3.5" /> Text template
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex-1 rounded-full px-3 py-1.5 ${
              mode === "upload"
                ? "bg-foundation-700 text-paper"
                : "text-foundation-700"
            }`}
          >
            <UploadIcon className="mr-1.5 inline h-3.5 w-3.5" /> Upload PDF/DOCX
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Template name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="eg. Standard 12-month residential"
            className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
          />
        </Field>
        <Field label="Notes (internal)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional"
            className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
          />
        </Field>
      </div>

      {mode === "text" ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <label className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Body
            </label>
            <button
              type="button"
              onClick={() => setShowAi((v) => !v)}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-foundation-700 hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              {showAi ? "Hide AI" : "Use AI"}
            </button>
          </div>

          {showAi && (
            <div className="mt-2 rounded-2xl border border-foundation-700/10 bg-foundation-700/5 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Property type">
                  <input
                    value={aiPropertyType}
                    onChange={(e) => setAiPropertyType(e.target.value)}
                    placeholder="apartment / duplex / shop / office"
                    className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                  />
                </Field>
                <Field label="Rent (NGN)">
                  <input
                    type="number"
                    min={0}
                    value={aiRent}
                    onChange={(e) => setAiRent(e.target.value)}
                    placeholder="optional"
                    className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                  />
                </Field>
                <Field label="Payment frequency">
                  <select
                    value={aiFrequency}
                    onChange={(e) =>
                      setAiFrequency(
                        e.target.value as "monthly" | "quarterly" | "annually"
                      )
                    }
                    className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </Field>
                <Field label="Jurisdiction">
                  <input
                    value={aiJurisdiction}
                    onChange={(e) => setAiJurisdiction(e.target.value)}
                    placeholder="eg. Lagos State, Nigeria"
                    className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                  />
                </Field>
              </div>
              <Field label="Special clauses (one per line)" className="mt-2">
                <textarea
                  value={aiSpecialClauses}
                  onChange={(e) => setAiSpecialClauses(e.target.value)}
                  rows={3}
                  placeholder="No pets&#10;Two months security deposit&#10;Tenant maintains generator"
                  className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                />
              </Field>
              <Field
                label="Instructions for refine (optional)"
                className="mt-2"
              >
                <input
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Make it more formal / shorter / add a notice clause"
                  className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={() => aiGen.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {aiGen.isPending ? "Drafting…" : "Generate draft"}
                </button>
                <button
                  type="button"
                  disabled={aiBusy || bodyText.trim().length < 50}
                  onClick={() => aiRefine.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiRefine.isPending ? "Refining…" : "Refine current body"}
                </button>
                <p className="ml-1 self-center text-[11px] text-ink-muted">
                  Uses Claude. Review the output before saving — it's a
                  starting point, not legal advice.
                </p>
              </div>
            </div>
          )}

          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={20}
            placeholder="This template body becomes the agreement PDF sent to tenants. Use [TENANT NAME], [LANDLORD NAME], [PROPERTY ADDRESS], [PROPERTY NAME], and [UNIT NUMBER] anywhere you want auto-substitution."
            className="mt-3 w-full rounded-xl border border-foundation-700/15 bg-paper p-4 font-mono text-[12.5px] leading-relaxed text-foundation-700"
          />
          <p className="mt-1 text-[11.5px] text-ink-muted">
            Minimum 30 characters. Placeholders [TENANT NAME], [LANDLORD NAME],
            [PROPERTY ADDRESS], [PROPERTY NAME], [UNIT NUMBER] are substituted
            automatically when a template is sent to a tenant.
          </p>
        </>
      ) : (
        <div className="mt-4">
          <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            PDF or DOCX
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
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Choose the master copy of your agreement
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  PDF or DOCX, max 25 MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.docx"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-foundation-700/15 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saveDisabled || create.isPending || upload.isPending || update.isPending}
          onClick={() => {
            if (isTextEdit) update.mutate();
            else if (mode === "text") create.mutate();
            else upload.mutate();
          }}
          className="rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
        >
          {create.isPending || upload.isPending || update.isPending
            ? "Saving…"
            : isEdit
            ? "Save changes"
            : "Save template"}
        </button>
      </div>
    </Card>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function toastErr(err: unknown, toast: ReturnType<typeof useToast>) {
  const ax = err as AxiosError<{ message?: string }>;
  toast.error(
    ax.response?.data?.message ?? (err as Error).message ?? "Something went wrong"
  );
}
