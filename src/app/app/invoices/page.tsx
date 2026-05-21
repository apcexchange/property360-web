"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  EmptyState,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, Invoice, InvoiceStatus } from "@/lib/landlord-api";

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

export default function InvoicesPage() {
  const q = useQuery({
    queryKey: ["invoices"],
    queryFn: () => landlordApi.listInvoices(),
  });

  return (
    <>
      <AppTopbar
        title="Invoices"
        subtitle="Bills you've sent tenants"
        actions={
          <Link
            href="/app/invoices/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        }
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="divide-y divide-foundation-700/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState
            title="No invoices yet"
            body="Create an invoice for a tenant — they'll be notified and can pay via Paystack."
            cta={{ label: "New invoice", href: "/app/invoices/new" }}
          />
        ) : (
          <Card className="divide-y divide-foundation-700/10">
            {q.data!.map((inv) => (
              <InvoiceRow key={inv._id} inv={inv} />
            ))}
          </Card>
        )}
      </PageContainer>
    </>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const tenant =
    typeof inv.tenant === "object"
      ? `${inv.tenant.firstName} ${inv.tenant.lastName}`
      : "Tenant";
  const property = typeof inv.property === "object" ? inv.property.name : "";
  const unit = typeof inv.unit === "object" ? `Unit ${inv.unit.unitNumber}` : "";
  return (
    <Link
      href={`/app/invoices/${inv._id}`}
      className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-foundation-700/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12.5px] text-ink-muted">
            #{inv.invoiceNumber}
          </p>
          <StatusPill
            label={inv.status.replace("_", " ")}
            tone={TONE_FOR_STATUS[inv.status]}
          />
        </div>
        <p className="mt-1 text-[14px] font-semibold text-foundation-700">
          {tenant}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {property} {unit && `· ${unit}`} · Due {formatDate(inv.dueDate)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[14px] font-semibold text-foundation-700">
          {formatNgn(inv.total)}
        </p>
        {inv.amountDue > 0 && inv.amountDue < inv.total && (
          <p className="text-[11.5px] text-ink-muted">
            {formatNgn(inv.amountDue)} due
          </p>
        )}
      </div>
    </Link>
  );
}
