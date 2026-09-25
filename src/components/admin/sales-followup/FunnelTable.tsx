import { Card, CardBody, CardHeader } from "@/components/admin/ui/Card";
import type { SalesFunnelRow } from "@/lib/admin";
import { pct, stepLabel, TRACK_LABELS } from "./labels";

/**
 * Funnel per track, step, variant and channel. "Subscribed" counts paid
 * activations within 7 days that were attributed to that touch.
 */
export function FunnelTable({ rows }: { rows: SalesFunnelRow[] }) {
  return (
    <Card className="mb-6">
      <CardHeader
        title="Funnel"
        description="Per step and variant. Preview rows show what would have been sent."
      />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-ink-muted">No touches yet. The first run happens within 15 minutes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-foundation-700 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foundation-700">
                  <th className="px-4 py-2.5">Step</th>
                  <th className="px-3 py-2.5">Var.</th>
                  <th className="px-3 py-2.5">Channel</th>
                  <th className="px-3 py-2.5 text-right">Sent</th>
                  <th className="px-3 py-2.5 text-right">Delivered</th>
                  <th className="px-3 py-2.5 text-right">Replied</th>
                  <th className="px-3 py-2.5 text-right">Opted out</th>
                  <th className="px-3 py-2.5 text-right">Subscribed (7d)</th>
                  <th className="px-3 py-2.5 text-right">Preview</th>
                  <th className="px-3 py-2.5 text-right">Skipped</th>
                  <th className="px-4 py-2.5 text-right">Failed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.stepKey}-${r.variant}-${r.channel}`} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foundation-700">{stepLabel(r.stepKey)}</div>
                      <div className="text-[11.5px] text-ink-muted">{TRACK_LABELS[r.track]}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{r.variant}</td>
                    <td className="px-3 py-2.5 capitalize">{r.channel}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.sent}</td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {r.channel === "whatsapp" ? `${r.delivered} (${pct(r.delivered, r.sent)})` : "n/a"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">
                      {r.replied} ({pct(r.replied, r.sent)})
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{r.optedOut}</td>
                    <td className="px-3 py-2.5 text-right tabular font-semibold text-foundation-700">
                      {r.subscribed} ({pct(r.subscribed, r.sent)})
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-amber-800">{r.dryRun}</td>
                    <td className="px-3 py-2.5 text-right tabular text-ink-muted">{r.skipped}</td>
                    <td className="px-4 py-2.5 text-right tabular text-error">{r.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
