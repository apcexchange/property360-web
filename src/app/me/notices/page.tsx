"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AxiosError } from "axios";
import { TenantTopbar } from "@/components/me/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  EmptyState,
  formatDate,
} from "@/components/app/ui";
import {
  tenantApi,
  QuitNotice,
  QUIT_NOTICE_REASON_LABELS,
} from "@/lib/tenant-api";
import { useToast } from "@/components/ui/Toast";

export default function NoticesPage() {
  const notices = useQuery({
    queryKey: ["me", "notices"],
    queryFn: () => tenantApi.listQuitNotices(),
  });

  return (
    <>
      <TenantTopbar
        title="Notices"
        subtitle="Quit notices and other formal communications from your landlord"
      />
      <PageContainer>
        {notices.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : notices.isError ? (
          <ErrorBox
            message={(notices.error as Error)?.message ?? "Couldn't load notices"}
            onRetry={() => notices.refetch()}
          />
        ) : (notices.data ?? []).length === 0 ? (
          <EmptyState
            title="No notices"
            body="You don't have any active notices from your landlord. If a quit notice is served, it will appear here."
          />
        ) : (
          <div className="space-y-4">
            {notices.data!.map((n) => (
              <NoticeCard key={n._id} notice={n} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function NoticeCard({ notice }: { notice: QuitNotice }) {
  const qc = useQueryClient();
  const toast = useToast();

  const daysRemaining = useMemo(() => {
    const ms = new Date(notice.expiresAt).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [notice.expiresAt]);

  const ack = useMutation({
    mutationFn: () => tenantApi.acknowledgeQuitNotice(notice._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "notices"] });
      toast.success("Notice acknowledged");
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ?? (err as Error).message ?? "Failed"
      );
    },
  });

  const tone: "good" | "warn" | "bad" | "neutral" =
    notice.status === "acknowledged"
      ? "good"
      : notice.status === "expired"
      ? "bad"
      : notice.status === "withdrawn"
      ? "neutral"
      : "warn";

  const isActive = notice.status === "served";
  const isUrgent = isActive && daysRemaining >= 0 && daysRemaining <= 7;
  const isOverdue = isActive && daysRemaining < 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foundation-700/10 p-5">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Notice to quit
          </p>
          <p className="mt-1 font-display text-[20px] font-extrabold text-foundation-700">
            {QUIT_NOTICE_REASON_LABELS[notice.reason]}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            From {notice.landlord?.firstName} {notice.landlord?.lastName} ·
            Served {formatDate(notice.servedAt ?? notice.issuedAt)}
            {notice.property?.name && ` · ${notice.property.name}`}
            {notice.unit?.unitNumber && `, Unit ${notice.unit.unitNumber}`}
          </p>
        </div>
        <StatusPill label={notice.status} tone={tone} />
      </div>

      <div
        className={`flex items-center gap-3 border-b border-foundation-700/10 px-5 py-4 ${
          isOverdue
            ? "bg-red-50"
            : isUrgent
            ? "bg-amber-50"
            : "bg-foundation-700/5"
        }`}
      >
        {isOverdue || isUrgent ? (
          <AlertTriangle
            className={`h-5 w-5 ${isOverdue ? "text-red-600" : "text-amber-600"}`}
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-foundation-700/10 text-[10px] font-bold text-foundation-700">
            i
          </span>
        )}
        <div className="flex-1">
          {isOverdue ? (
            <p className="text-[13px] font-semibold text-red-700">
              This notice expired {Math.abs(daysRemaining)} day
              {Math.abs(daysRemaining) === 1 ? "" : "s"} ago.
            </p>
          ) : isActive ? (
            <p className="text-[13px] font-semibold text-foundation-700">
              {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left to vacate
              the premises, expires {formatDate(notice.expiresAt)}.
            </p>
          ) : notice.status === "acknowledged" ? (
            <p className="text-[13px] font-semibold text-foundation-700">
              You acknowledged this notice
              {notice.acknowledgedAt
                ? ` on ${formatDate(notice.acknowledgedAt)}`
                : ""}
              . It expires {formatDate(notice.expiresAt)}.
            </p>
          ) : (
            <p className="text-[13px] font-semibold text-foundation-700">
              Expires {formatDate(notice.expiresAt)}.
            </p>
          )}
        </div>
      </div>

      {notice.reasonDetail && (
        <div className="border-b border-foundation-700/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Reason detail
          </p>
          <p className="mt-1 text-[13px] text-foundation-700">
            {notice.reasonDetail}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <a
          href={notice.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <Download className="h-3.5 w-3.5" /> Open notice
        </a>
        {notice.status === "served" && (
          <button
            type="button"
            disabled={ack.isPending}
            onClick={() => ack.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {ack.isPending ? "Acknowledging…" : "Acknowledge receipt"}
          </button>
        )}
      </div>
    </Card>
  );
}
