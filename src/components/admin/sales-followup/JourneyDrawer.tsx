"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "@/components/admin/ui/Drawer";
import { Button } from "@/components/admin/ui/Filters";
import { ErrorState } from "@/components/admin/ui/ErrorState";
import { StatusBadge } from "@/components/admin/DataTable";
import adminApi, { SalesJourneyDetail } from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";
import { errorMessage, SKIP_REASON_LABELS, STATUS_LABELS, STOP_REASON_LABELS, stepLabel, TRACK_LABELS } from "./labels";

type TimelineItem =
  | { kind: "touch"; at: string; touch: SalesJourneyDetail["touches"][number] }
  | { kind: "message"; at: string; message: SalesJourneyDetail["messages"][number] };

function formatDateTime(raw?: string | null): string {
  if (!raw) return "n/a";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function timeline(d: SalesJourneyDetail): TimelineItem[] {
  const items: TimelineItem[] = [
    ...d.touches.map((touch) => ({ kind: "touch" as const, at: touch.createdAt, touch })),
    ...d.messages.map((message) => ({ kind: "message" as const, at: message.createdAt, message })),
  ];
  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * Journey detail: state, timeline of touches and WhatsApp chat, stop and
 * restart. Keyed by journeyId from the outer wrapper below so switching to a
 * different journey (or closing and reopening) always starts with fresh
 * mutation state, a stale "couldn't stop" error from the previous journey
 * can never bleed into the next one's footer.
 */
function JourneyDrawerInner({ journeyId, onClose }: { journeyId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "sales-followup", "journey", journeyId],
    queryFn: () => adminApi.getSalesJourney(journeyId as string),
    enabled: journeyId !== null,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "sales-followup"] });
  const stop = useMutation({ mutationFn: (id: string) => adminApi.stopSalesJourney(id), onSuccess: refresh });
  const restart = useMutation({ mutationFn: (id: string) => adminApi.restartSalesJourney(id), onSuccess: refresh });
  const actionPending = stop.isPending || restart.isPending;
  const actionError = stop.error ?? restart.error;

  const d = detail.data;
  const j = d?.journey;
  const name = j?.user ? `${j.user.firstName} ${j.user.lastName}` : "Deleted user";
  const items = d ? timeline(d) : [];

  return (
    <Drawer
      open={journeyId !== null}
      onClose={onClose}
      title={j ? name : "Loading…"}
      subtitle={j?.user ? [j.user.email, j.user.phone, j.user.role].filter(Boolean).join(" · ") : undefined}
      width="xl"
      footer={
        j && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-error">{actionError ? errorMessage(actionError) : ""}</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={actionPending || j.status === "stopped" || j.status === "converted"}
                onClick={() => stop.mutate(j._id)}
              >
                Stop
              </Button>
              <Button
                variant="success"
                disabled={actionPending || j.stopReason === "opt_out" || j.status === "converted"}
                onClick={() => restart.mutate(j._id)}
              >
                Restart
              </Button>
            </div>
          </div>
        )
      }
    >
      {detail.isError ? (
        <ErrorState
          title="Could not load this journey"
          description={errorMessage(detail.error)}
          onRetry={() => void detail.refetch()}
        />
      ) : detail.isLoading || !d || !j ? (
        <p className="text-[13.5px] text-ink-muted">Loading journey…</p>
      ) : (
        <div className="space-y-6">
          {j.hot && (
            <div className="border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-foundation-700">
              <p className="font-semibold text-error">Hot lead, handed to the team {formatDateTime(j.hotAt)}</p>
              {j.handoffSummary && <p className="mt-1">{j.handoffSummary}</p>}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Track</dt>
              <dd className="mt-0.5 text-foundation-700">{TRACK_LABELS[j.track]}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Status</dt>
              <dd className="mt-0.5 text-foundation-700">
                {STATUS_LABELS[j.status]}
                {j.stopReason ? ` (${STOP_REASON_LABELS[j.stopReason] ?? j.stopReason})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Next step</dt>
              <dd className="mt-0.5 text-foundation-700">{j.nextStepAt ? formatDateTime(j.nextStepAt) : "None"}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Variant</dt>
              <dd className="mt-0.5 font-mono text-foundation-700">{j.variant}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">WhatsApp</dt>
              <dd className="mt-0.5 text-foundation-700">
                {j.whatsappUnpromptedCount} of 6 sent{j.whatsappDisabled ? ", disabled after failures" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Email</dt>
              <dd className="mt-0.5 text-foundation-700">{j.emailUnsubscribed ? "Unsubscribed" : "Subscribed"}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Subscription</dt>
              <dd className="mt-0.5 text-foundation-700">
                {d.subscription ? `${d.subscription.tier}, ${d.subscription.status.replace(/_/g, " ")}` : "None yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Last plan link</dt>
              <dd className="mt-0.5 text-foundation-700">
                {j.lastPlanLink ? `${j.lastPlanLink.tier} ${j.lastPlanLink.interval}` : "None"}
              </dd>
            </div>
            {j.convertedAt && (
              <div className="col-span-2">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Converted</dt>
                <dd className="mt-0.5 text-foundation-700">
                  {formatDate(j.convertedAt)}, {formatNgn(j.convertedAmountNgn ?? 0)}
                  {j.attributedStep ? `, after ${stepLabel(j.attributedStep)}` : ""}
                  {j.attributedToChat ? ", chatted with the AI" : ""}
                </dd>
              </div>
            )}
            {j.stopNote && (
              <div className="col-span-2">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Note</dt>
                <dd className="mt-0.5 text-foundation-700">{j.stopNote}</dd>
              </div>
            )}
          </dl>

          <div>
            <h4 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700">Timeline</h4>
            {items.length === 0 ? (
              <p className="text-[13px] text-ink-muted">Nothing yet.</p>
            ) : (
              <ol className="space-y-2">
                {items.map((item) =>
                  item.kind === "touch" ? (
                    <li key={`t-${item.touch._id}`} className="border border-rule bg-paper-deep/30 px-3 py-2 text-[12.5px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foundation-700">
                          {stepLabel(item.touch.stepKey)} · {item.touch.channel} · {item.touch.variant}
                        </span>
                        <StatusBadge value={item.touch.status} />
                      </div>
                      <div className="mt-0.5 text-ink-muted">
                        {formatDateTime(item.at)} · {item.touch.templateOrEmailKey}
                        {item.touch.skipReason
                          ? ` · ${SKIP_REASON_LABELS[item.touch.skipReason] ?? item.touch.skipReason}`
                          : ""}
                        {item.touch.repliedAt ? " · replied" : ""}
                        {item.touch.optedOutAt ? " · opted out" : ""}
                        {item.touch.convertedAt ? " · subscribed" : ""}
                      </div>
                    </li>
                  ) : (
                    <li
                      key={`m-${item.message._id}`}
                      className={`flex ${item.message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 text-[13px] ${
                          item.message.role === "user"
                            ? "bg-foundation-700 text-paper"
                            : "border border-rule bg-surface text-foundation-700"
                        }`}
                      >
                        {item.message.content}
                        <p className="mt-1 text-[10px] opacity-60">
                          {formatDateTime(item.at)}
                          {item.message.mode === "sales" ? " · sales mode" : ""}
                        </p>
                      </div>
                    </li>
                  )
                )}
              </ol>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function JourneyDrawer({ journeyId, onClose }: { journeyId: string | null; onClose: () => void }) {
  return <JourneyDrawerInner key={journeyId ?? "closed"} journeyId={journeyId} onClose={onClose} />;
}
