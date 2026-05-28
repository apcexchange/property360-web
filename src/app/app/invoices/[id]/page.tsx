"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Ban, Send, Download, Mail } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, InvoiceStatus } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

const TONE_FOR_STATUS: Record<
  InvoiceStatus,
  "good" | "warn" | "bad" | "neutral" | "info"
> = {
  draft: "neutral",
  sent: "info",
  paid: "good",
  partially_paid: "warn",
  overdue: "bad",
  cancelled: "neutral",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => landlordApi.getInvoice(id),
    enabled: !!id,
  });

  const markPaid = useMutation({
    mutationFn: () => landlordApi.markInvoicePaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success("Invoice marked as paid");
    },
    onError: () => toast.error("Couldn't mark invoice as paid"),
  });
  const cancel = useMutation({
    mutationFn: () => landlordApi.cancelInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success("Invoice cancelled");
    },
    onError: () => toast.error("Couldn't cancel invoice"),
  });
  const sendDraft = useMutation({
    mutationFn: () => landlordApi.sendInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success({
        title: "Invoice sent",
        body: "Tenant will receive a branded PDF by email.",
      });
    },
    onError: () => toast.error("Couldn't send invoice"),
  });
  const emailAgain = useMutation({
    mutationFn: () => landlordApi.emailInvoice(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success({
        title: "Email sent",
        body: `Sent to ${r.emailedTo}`,
      });
    },
    onError: () => toast.error("Couldn't email invoice"),
  });
  const downloadPdf = useMutation({
    mutationFn: () => landlordApi.downloadInvoicePdf(id),
    onSuccess: (r) => {
      window.open(r.pdfUrl, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error("Couldn't fetch invoice PDF"),
  });

  const inv = q.data;
  const canMarkPaid =
    !!inv && inv.status !== "paid" && inv.status !== "cancelled";
  const canCancel = !!inv && inv.status !== "paid" && inv.status !== "cancelled";
  const canSend = !!inv && inv.status === "draft";
  const canEmail = !!inv && inv.status !== "draft" && inv.status !== "cancelled";

  return (
    <>
      <AppTopbar
        title={inv ? `Invoice #${inv.invoiceNumber}` : "Invoice"}
        actions={
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <Skeleton className="mt-6 h-40 w-full" />
          </Card>
        ) : q.isError || !inv ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Invoice not found."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[13px] text-ink-muted">
                      #{inv.invoiceNumber}
                    </p>
                    <StatusPill
                      label={inv.status.replace("_", " ")}
                      tone={TONE_FOR_STATUS[inv.status]}
                    />
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-foundation-700">
                    {typeof inv.tenant === "object"
                      ? `${inv.tenant.firstName} ${inv.tenant.lastName}`
                      : "Tenant"}
                  </p>
                  <p className="text-[12.5px] text-ink-muted">
                    {typeof inv.property === "object" ? inv.property.name : ""}
                    {typeof inv.unit === "object"
                      ? ` · Unit ${inv.unit.unitNumber}`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Total
                  </p>
                  <p className="mt-1 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                    {formatNgn(inv.total)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    Due {formatDate(inv.dueDate)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="mt-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foundation-700/10 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Rate</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foundation-700/10 text-[13.5px] text-foundation-700">
                  {inv.lineItems.map((l, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3">{l.description}</td>
                      <td className="px-5 py-3 text-right">{l.quantity}</td>
                      <td className="px-5 py-3 text-right">{formatNgn(l.rate)}</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatNgn(l.amount ?? l.quantity * l.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-foundation-700/10 p-5">
                <Row label="Subtotal" value={formatNgn(inv.subtotal)} />
                {inv.taxAmount > 0 && (
                  <Row label="Tax" value={formatNgn(inv.taxAmount)} />
                )}
                <Row label="Total" value={formatNgn(inv.total)} bold />
                {inv.amountPaid > 0 && (
                  <Row
                    label="Paid"
                    value={`− ${formatNgn(inv.amountPaid)}`}
                    muted
                  />
                )}
                {inv.amountDue > 0 && (
                  <Row label="Outstanding" value={formatNgn(inv.amountDue)} bold />
                )}
              </div>
            </Card>

            {inv.notes && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-foundation-700">
                  {inv.notes}
                </p>
              </Card>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => downloadPdf.mutate()}
                disabled={downloadPdf.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />{" "}
                {downloadPdf.isPending ? "Preparing…" : "Download PDF"}
              </button>
              {canEmail && (
                <button
                  type="button"
                  onClick={() => emailAgain.mutate()}
                  disabled={emailAgain.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />{" "}
                  {emailAgain.isPending ? "Sending…" : "Re-send email"}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Cancel this invoice?")) cancel.mutate();
                  }}
                  disabled={cancel.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />{" "}
                  {cancel.isPending ? "Cancelling…" : "Cancel"}
                </button>
              )}
              {canSend && (
                <button
                  type="button"
                  onClick={() => sendDraft.mutate()}
                  disabled={sendDraft.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />{" "}
                  {sendDraft.isPending ? "Sending…" : "Send invoice"}
                </button>
              )}
              {canMarkPaid && (
                <button
                  type="button"
                  onClick={() => markPaid.mutate()}
                  disabled={markPaid.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />{" "}
                  {markPaid.isPending ? "Marking…" : "Mark as paid"}
                </button>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={`text-[13px] ${
          muted ? "text-ink-muted" : "text-foundation-700"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-[13.5px] ${
          bold ? "font-bold text-foundation-700" : "text-foundation-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

