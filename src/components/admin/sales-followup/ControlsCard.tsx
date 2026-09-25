"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import { Button, Select } from "@/components/admin/ui/Filters";
import adminApi, { SalesFollowUpSettings, SalesStepInfo, StepVariantSetting } from "@/lib/admin";
import { stepLabel, TRACK_LABELS } from "./labels";

/**
 * Pause and preview switches plus the per-step A/B control. Preview mode is
 * the safe default: every send is recorded as a dry run and nothing reaches
 * users (and WhatsApp replies behave exactly as they did before this
 * feature, only STOP/START are live). Turning it off asks for confirmation.
 */
export function ControlsCard({ settings, steps }: { settings: SalesFollowUpSettings; steps: SalesStepInfo[] }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.updateSalesFollowUpSettings>[0]) =>
      adminApi.updateSalesFollowUpSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sales-followup"] }),
  });

  function togglePreview() {
    if (settings.previewMode) {
      const ok = window.confirm(
        "Go live? Real WhatsApp messages and emails will be sent to landlords and agents on the next run (every 15 minutes)."
      );
      if (!ok) return;
    }
    save.mutate({ previewMode: !settings.previewMode });
  }

  const showDryRunWarning = !settings.previewMode && settings.whatsappDryRun;

  return (
    <Card className="mb-6">
      <CardHeader
        title="Controls"
        description="Pause stops every scheduled send. Preview records what would be sent without sending it."
      />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${
              settings.paused ? "text-error" : "text-foundation-700"
            }`}
          >
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${settings.paused ? "bg-error" : "bg-cryola-500"}`}
            />
            {settings.paused ? "Paused" : "Running"}
          </span>
          <span
            className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
              settings.previewMode ? "text-amber-800" : "text-foundation-700"
            }`}
          >
            {settings.previewMode ? "Preview mode: nothing is sent and WhatsApp replies behave as before" : "Live"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant={settings.paused ? "success" : "danger"}
              disabled={save.isPending}
              onClick={() => save.mutate({ paused: !settings.paused })}
            >
              {settings.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant={settings.previewMode ? "primary" : "secondary"} disabled={save.isPending} onClick={togglePreview}>
              {settings.previewMode ? "Go live" : "Back to preview"}
            </Button>
          </div>
        </div>

        {showDryRunWarning && (
          <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            Live mode is on, but WhatsApp dry run is enabled on the server, so WhatsApp steps are
            being used up without sending. Set WHATSAPP_DRY_RUN=false or switch back to preview.
          </p>
        )}

        {save.isError && (
          <p className="text-[12.5px] text-error">Couldn&apos;t save: {(save.error as Error).message}</p>
        )}

        <div className="overflow-x-auto border border-rule">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule bg-paper-deep/40 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foundation-700">
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">WhatsApp template</th>
                <th className="px-3 py-2">Variant</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.key} className="border-b border-rule last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foundation-700">{stepLabel(s.key)}</div>
                    <div className="text-[11.5px] text-ink-muted">
                      {TRACK_LABELS[s.track]}
                      {s.marketing ? ", marketing" : ", utility"}
                    </div>
                  </td>
                  <td className="px-3 py-2 capitalize text-ink-body">
                    {s.channel}
                    {s.emailFallback ? " (email fallback)" : ""}
                  </td>
                  <td className="px-3 py-2 text-ink-body">
                    {s.templateKey ? (
                      <span>
                        A: {s.whatsappA ? "approved" : "not set"}, B: {s.whatsappB ? "approved" : "not set"}
                      </span>
                    ) : (
                      <span className="text-ink-faint">Email only</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={s.variantSetting}
                      onChange={(v) => save.mutate({ stepVariants: { [s.key]: v as StepVariantSetting } })}
                    >
                      <option value="ab">A/B split</option>
                      <option value="A">Always A</option>
                      <option value="B">Always B</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
