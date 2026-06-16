"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  EmptyState,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { tenantApi } from "@/lib/tenant-api";
import { useToast } from "@/components/ui/Toast";

export default function LeasePage() {
  const dash = useQuery({
    queryKey: ["me", "dashboard"],
    queryFn: () => tenantApi.getDashboard(),
  });

  return (
    <>
      <TenantTopbar title="Lease summary" subtitle="Your tenancy at a glance" />
      <PageContainer>
        {dash.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-48 w-full" />
          </Card>
        ) : dash.isError ? (
          <ErrorBox
            message={(dash.error as Error)?.message}
            onRetry={() => dash.refetch()}
          />
        ) : !dash.data ? (
          <EmptyState
            title="No active lease"
            body="You'll see your lease details here once a landlord assigns you to a unit."
            cta={{ label: "Browse listings", href: "/listings" }}
          />
        ) : (
          <Content data={dash.data} />
        )}
      </PageContainer>
    </>
  );
}

function Content({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof tenantApi.getDashboard>>>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [startingId, setStartingId] = useState<string | null>(null);
  const { lease, property, unit, landlord } = data;
  const managers = data.managers ?? [];

  // Open (or create) an in-app chat with a lease contact, then jump to the
  // thread. Only one can be starting at a time.
  const startChat = async (recipientId: string) => {
    if (startingId) return;
    setStartingId(recipientId);
    try {
      const { id } = await tenantApi.startLeaseConversation(recipientId);
      router.push(id ? `/me/chat?c=${id}` : "/me/chat");
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ?? "Couldn't open the chat. Try again."
      );
      setStartingId(null);
    }
  };

  const fees: Array<{ label: string; amount: number; key: string }> = [
    { key: "securityDeposit", label: "Security deposit", amount: lease.securityDeposit },
    { key: "cautionFee", label: "Caution fee", amount: lease.cautionFee },
    { key: "agentFee", label: "Agent fee", amount: lease.agentFee },
    { key: "agreementFee", label: "Agreement fee", amount: lease.agreementFee },
    { key: "legalFee", label: "Legal fee", amount: lease.legalFee },
    { key: "serviceCharge", label: "Service charge", amount: lease.serviceCharge },
    {
      key: "otherFee",
      label: lease.otherFeeDescription || "Other fee",
      amount: lease.otherFee,
    },
  ].filter((f) => (f.amount ?? 0) > 0);

  const statusTone: "good" | "warn" | "bad" | "neutral" =
    lease.status === "active"
      ? "good"
      : lease.status === "pending"
      ? "warn"
      : "bad";

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {property.name} · Unit {unit.unitNumber}
            </p>
            <p className="mt-2 font-display text-[22px] font-extrabold text-foundation-700">
              {formatNgn(lease.rentAmount)}
              <span className="ml-1 text-[13px] font-medium text-ink-muted">
                / {lease.paymentFrequency}
              </span>
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {[property.address?.street, property.address?.city, property.address?.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <StatusPill label={lease.status} tone={statusTone} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <KeyValue label="Start date" value={formatDate(lease.startDate)} />
          <KeyValue label="End date" value={formatDate(lease.endDate)} />
          <KeyValue
            label="Frequency"
            value={
              lease.paymentFrequency
                ? lease.paymentFrequency.charAt(0).toUpperCase() +
                  lease.paymentFrequency.slice(1)
                : "—"
            }
          />
          <KeyValue
            label="Bedrooms"
            value={unit.bedrooms ? `${unit.bedrooms}` : "—"}
          />
          <KeyValue
            label="Bathrooms"
            value={unit.bathrooms ? `${unit.bathrooms}` : "—"}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Fees on this lease
        </h2>
        {fees.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            No additional fees on your lease.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-foundation-700/10">
            {fees.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between py-3"
              >
                <span className="text-[13.5px] text-foundation-700">
                  {f.label}
                </span>
                <span className="text-[13.5px] font-semibold text-foundation-700">
                  {formatNgn(f.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ContactCard
        role="Landlord"
        contact={landlord}
        onChat={() => startChat(landlord.id)}
        chatting={startingId === landlord.id}
        chatDisabled={!!startingId && startingId !== landlord.id}
      />

      {managers.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            {managers.length > 1 ? "Property managers" : "Property manager"}
          </h2>
          <div className="mt-3 space-y-5 divide-y divide-foundation-700/10">
            {managers.map((m, i) => (
              <div key={m.id} className={i > 0 ? "pt-5" : ""}>
                <ContactBody
                  contact={m}
                  onChat={() => startChat(m.id)}
                  chatting={startingId === m.id}
                  chatDisabled={!!startingId && startingId !== m.id}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

function ContactCard({
  role,
  contact,
  onChat,
  chatting,
  chatDisabled,
}: {
  role: string;
  contact: Contact;
  onChat: () => void;
  chatting: boolean;
  chatDisabled: boolean;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {role}
      </h2>
      <div className="mt-3">
        <ContactBody
          contact={contact}
          onChat={onChat}
          chatting={chatting}
          chatDisabled={chatDisabled}
        />
      </div>
    </Card>
  );
}

function ContactBody({
  contact,
  onChat,
  chatting,
  chatDisabled,
}: {
  contact: Contact;
  onChat: () => void;
  chatting: boolean;
  chatDisabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-display text-[18px] font-extrabold text-foundation-700">
          {contact.firstName} {contact.lastName}
        </p>
        <div className="mt-2 space-y-2 text-[13.5px]">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-foundation-700 transition hover:text-foundation-800"
            >
              <Mail className="h-4 w-4 text-ink-muted" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-foundation-700 transition hover:text-foundation-800"
            >
              <Phone className="h-4 w-4 text-ink-muted" />
              {contact.phone}
            </a>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChat}
        disabled={chatting || chatDisabled}
        className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        {chatting ? "Opening…" : "Chat in app"}
      </button>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold text-foundation-700">
        {value}
      </p>
    </div>
  );
}
