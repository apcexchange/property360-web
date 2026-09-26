"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Filters";
import { ErrorState } from "@/components/admin/ui/ErrorState";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Skeleton } from "@/components/admin/ui/Skeleton";
import adminApi, {
  SalesMessageEmailVariant,
  SalesMessageStep,
  SalesMessageWhatsappVariant,
  SalesVariant,
} from "@/lib/admin";
import { errorMessage, stepLabel, TRACK_LABELS } from "./labels";

interface EmailPreview {
  stepKey: string;
  variant: SalesVariant;
  subject: string;
  html: string;
}

/** A: what's configured, plus what happens to the journey when it isn't. */
function whatsappStatusA(step: SalesMessageStep, v: SalesMessageWhatsappVariant): { primary: string; secondary?: string } {
  if (v.configured) return { primary: `Template set: ${v.templateName}` };
  const fallback = step.channel === "both" || step.emailFallback ? "email is sent instead" : "this step is skipped";
  return { primary: "Not set up yet", secondary: fallback };
}

/** B: its own copy, a draft fallback to A, or a template of its own. */
function whatsappStatusB(v: SalesMessageWhatsappVariant): string {
  if (!v.hasOwnCopy) return "Uses A's wording";
  if (v.usesFallbackToA) return "Draft: B journeys get A until this template is approved and set";
  return `Template set: ${v.templateName}`;
}

function WhatsappVariantBlock({ step, variant }: { step: SalesMessageStep; variant: SalesMessageWhatsappVariant }) {
  const status = variant.variant === "A" ? whatsappStatusA(step, variant) : { primary: whatsappStatusB(variant) };
  return (
    <div className="border border-rule bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foundation-700">
          Variant {variant.variant}
        </span>
        <span className="min-w-0 break-words text-[11.5px] text-ink-muted [overflow-wrap:anywhere]">
          {status.primary}
          {status.secondary ? `, ${status.secondary}` : ""}
        </span>
      </div>
      <div className="mt-2 max-w-[85%] whitespace-pre-wrap break-words bg-cryola-50 px-3 py-2 text-[13px] text-foundation-700">
        {variant.body}
      </div>
      {variant.footer && (
        <p className="mt-1 whitespace-pre-wrap break-words text-[11.5px] italic text-ink-muted">{variant.footer}</p>
      )}
    </div>
  );
}

function EmailVariantBlock({
  stepKey,
  variant,
  onView,
}: {
  stepKey: string;
  variant: SalesMessageEmailVariant;
  onView: (preview: EmailPreview) => void;
}) {
  return (
    <div className="border border-rule bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foundation-700">
          Variant {variant.variant}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onView({ stepKey, variant: variant.variant, subject: variant.subject, html: variant.html })}
        >
          View email
        </Button>
      </div>
      <p className="mt-2 break-words font-semibold text-foundation-700">{variant.subject}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-ink-body">{variant.text}</p>
    </div>
  );
}

const CHANNEL_LABELS: Record<SalesMessageStep["channel"], string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  both: "WhatsApp + email",
};

function ChannelBadge({ step }: { step: SalesMessageStep }) {
  return (
    <span className="inline-flex items-center rounded-full border border-rule-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foundation-700">
      {CHANNEL_LABELS[step.channel]}
      {step.emailFallback ? " + email fallback" : ""}
    </span>
  );
}

function MarketingBadge({ step }: { step: SalesMessageStep }) {
  return (
    <span className="inline-flex items-center rounded-full border border-rule-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
      {step.marketing ? "Marketing" : "Utility"}
    </span>
  );
}

function StepBlock({ step, onViewEmail }: { step: SalesMessageStep; onViewEmail: (preview: EmailPreview) => void }) {
  return (
    <div className="border border-rule bg-paper-deep/20 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foundation-700">{stepLabel(step.stepKey)}</span>
        <span className="text-[11px] text-ink-muted">Day {step.dayOffset}</span>
        <ChannelBadge step={step} />
        <MarketingBadge step={step} />
      </div>

      {step.whatsapp && (
        <div className="mt-3 space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            WhatsApp ({step.whatsapp.category === "MARKETING" ? "marketing" : "utility"} template)
          </p>
          <div className="space-y-2">
            {step.whatsapp.variants.map((v) => (
              <WhatsappVariantBlock key={v.variant} step={step} variant={v} />
            ))}
          </div>
        </div>
      )}

      {step.email && (
        <div className="mt-3 space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Email</p>
          <div className="space-y-2">
            {step.email.variants.map((v) => (
              <EmailVariantBlock key={v.variant} stepKey={step.stepKey} variant={v} onView={onViewEmail} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Every follow-up step rendered with fixed sample data, so an admin can read
 * the exact WhatsApp and email copy without waiting for a real journey to
 * reach that step. Grouped by track, reusing the same labels as the journeys
 * table above. Text only: email HTML is only ever shown inside a sandboxed
 * iframe, never injected into the page.
 */
export function MessageLibrary() {
  const query = useQuery({
    queryKey: ["admin", "sales-followup", "messages"],
    queryFn: () => adminApi.getSalesFollowUpMessages(),
  });
  const [preview, setPreview] = useState<EmailPreview | null>(null);

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the message library"
        description={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { tracks, sample } = query.data;
  const nonEmptyTracks = tracks.filter((t) => t.steps.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-[12.5px] italic text-ink-muted">
        Rendered with sample data: {sample.firstName}, {sample.trialDaysLeft} left in a {sample.trialLengthDays} day
        trial. Links shown here are placeholders, never real signed tokens.
      </p>

      {nonEmptyTracks.length === 0 ? (
        <EmptyState
          title="No steps configured"
          description="Steps come from the follow-up schedule on the server."
        />
      ) : (
        nonEmptyTracks.map((t) => (
          <Card key={t.track}>
            <CardHeader
              title={TRACK_LABELS[t.track]}
              description={`${t.steps.length} step${t.steps.length === 1 ? "" : "s"}`}
            />
            <CardBody className="space-y-3">
              {t.steps.map((step) => (
                <StepBlock key={step.stepKey} step={step} onViewEmail={setPreview} />
              ))}
            </CardBody>
          </Card>
        ))
      )}

      <Drawer
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? `${stepLabel(preview.stepKey)}, variant ${preview.variant}` : ""}
        subtitle={preview?.subject}
        width="xl"
      >
        {preview && (
          <iframe
            sandbox=""
            srcDoc={preview.html}
            title={`Email preview: ${preview.subject}`}
            className="h-[70vh] w-full border border-rule bg-white"
          />
        )}
      </Drawer>
    </div>
  );
}
