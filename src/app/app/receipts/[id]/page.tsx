"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, ReceiptPaymentMethod } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

const PAYMENT_METHOD_LABEL: Record<ReceiptPaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  mobile_money: "Mobile money",
  card: "Card",
  other: "Other",
};

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["receipts", id],
    queryFn: () => landlordApi.getReceipt(id),
    enabled: !!id,
  });

  const emailAgain = useMutation({
    mutationFn: () => landlordApi.emailReceipt(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["receipts", id] });
      toast.success({
        title: "Receipt emailed",
        body: `Sent to ${r.emailedTo}`,
      });
    },
    onError: () => toast.error("Couldn't email receipt"),
  });
  const downloadPdf = useMutation({
    mutationFn: () => landlordApi.downloadReceiptPdf(id),
    onSuccess: (r) => {
      window.open(r.pdfUrl, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error("Couldn't fetch receipt PDF"),
  });

  const r = q.data;
  const tenant =
    r && typeof r.tenant === "object"
      ? r.tenant
      : { firstName: "Tenant", lastName: "", email: "", phone: undefined };
  const property =
    r && typeof r.property === "object" ? r.property : { name: "" };
  const unit =
    r && typeof r.unit === "object" ? r.unit : undefined;
  const invoice =
    r && r.invoice && typeof r.invoice === "object" ? r.invoice : null;

  return (
    <>
      <AppTopbar
        title={r ? `Receipt #${r.receiptNumber}` : "Receipt"}
        actions={
          <Link
            href="/app/receipts"
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
        ) : q.isError || !r ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Receipt not found."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[13px] text-ink-muted">
                    #{r.receiptNumber}
                  </p>
                  <p className="mt-2 text-[14px] font-semibold text-foundation-700">
                    {tenant.firstName} {tenant.lastName}
                  </p>
                  <p className="text-[12.5px] text-ink-muted">
                    {property.name}
                    {unit ? ` · Unit ${unit.unitNumber}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Amount received
                  </p>
                  <p className="mt-1 font-display text-[28px] font-extrabold leading-none text-foundation-700">
                    {formatNgn(r.amount)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {formatDate(r.paymentDate)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="mt-6 p-5">
              <Row
                label="Payment method"
                value={PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}
              />
              <Row label="For" value={r.description} />
              {invoice && (
                <>
                  <Row
                    label="Invoice"
                    value={
                      <Link
                        href={`/app/invoices/${invoice._id}`}
                        className="text-foundation-700 underline"
                      >
                        #{invoice.invoiceNumber}
                      </Link>
                    }
                  />
                  <Row label="Invoice total" value={formatNgn(invoice.total)} />
                  <Row label="Total paid" value={formatNgn(invoice.amountPaid)} />
                  <Row
                    label={
                      invoice.amountDue <= 0 ? "Balance" : "Balance remaining"
                    }
                    value={formatNgn(invoice.amountDue)}
                    bold
                  />
                </>
              )}
              {r.emailedAt && r.emailedTo && (
                <Row
                  label="Emailed"
                  value={`${r.emailedTo} · ${formatDate(r.emailedAt)}`}
                  muted
                />
              )}
            </Card>

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
              <button
                type="button"
                onClick={() => emailAgain.mutate()}
                disabled={emailAgain.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />{" "}
                {emailAgain.isPending ? "Sending…" : "Re-send to tenant"}
              </button>
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
  value: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
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
