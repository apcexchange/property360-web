"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, X, Mail, Phone } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  PageContainer,
  Card,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi, ReservationStatus } from "@/lib/landlord-api";

const TONE: Record<ReservationStatus, "good" | "warn" | "bad" | "info"> = {
  pending: "warn",
  approved: "good",
  declined: "bad",
  paid: "good",
  cancelled: "neutral" as never,
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const [proposedViewingAt, setProposedViewingAt] = useState("");
  const [viewingNote, setViewingNote] = useState("");

  // Reservation detail isn't a standalone endpoint, pull from the list.
  const list = useQuery({
    queryKey: ["marketplace", "reservations"],
    queryFn: () => landlordApi.landlordReservationRequests(),
  });
  const r = list.data?.find((x) => x._id === id);

  const approve = useMutation({
    mutationFn: () => landlordApi.approveReservation(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["marketplace", "reservations"] }),
  });
  const decline = useMutation({
    mutationFn: () => landlordApi.declineReservation(id, declineReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace", "reservations"] });
      setShowDecline(false);
    },
  });
  const proposeViewing = useMutation({
    mutationFn: () => landlordApi.proposeReservationViewing(
      id,
      new Date(proposedViewingAt).toISOString(),
      viewingNote.trim() || undefined
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace", "reservations"] });
      setShowPropose(false);
    },
  });
  const recordOutcome = useMutation({
    mutationFn: (outcome: "completed" | "no_show" | "reschedule_needed") =>
      landlordApi.recordReservationViewingOutcome(id, outcome),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace", "reservations"] }),
  });

  const actionError =
    approve.isError || decline.isError || proposeViewing.isError || recordOutcome.isError
      ? ((approve.error || decline.error || proposeViewing.error || recordOutcome.error) as AxiosError<{ message?: string }>)
          .response?.data?.message ?? "Action failed"
      : null;

  return (
    <>
      <AppTopbar
        title="Reservation request"
        subtitle={r ? `${r.tenant?.firstName} ${r.tenant?.lastName}` : undefined}
        actions={
          <Link
            href="/app/marketplace/reservations"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {!r ? (
          list.isLoading ? (
            <BrandLoader fullScreen={false} />
          ) : (
            <ErrorBox message="Reservation not found." />
          )
        ) : (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Prospect
                  </p>
                  <p className="mt-2 font-display text-[22px] font-extrabold text-foundation-700">
                    {r.tenant?.firstName} {r.tenant?.lastName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {r.tenant?.email}
                    </span>
                    {r.tenant?.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {r.tenant?.phone}
                      </span>
                    )}
                  </div>
                </div>
                <StatusPill label={r.status} tone={TONE[r.status]} />
              </div>
            </Card>

            <Card className="mt-6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Unit
              </p>
              <p className="mt-2 text-[14px] font-semibold text-foundation-700">
                {typeof r.property === "object" ? r.property.name : ""}
                {typeof r.unit === "object" && ` · Unit ${r.unit.unitNumber}`}
              </p>
              {typeof r.unit === "object" && (
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  {r.unit.bedrooms} bed · {r.unit.bathrooms} bath ·{" "}
                  {formatNgn(r.unit.rentAmount)}/{r.unit.rentPeriod ?? "annually"}
                </p>
              )}
              <p className="mt-2 text-[11.5px] text-ink-muted">
                Submitted {formatDate(r.createdAt)}
              </p>
              {r.preferredViewingAt && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-cryola-100/70 px-3 py-2 text-[12.5px] font-medium text-foundation-700">
                  <CalendarClock className="h-4 w-4" />
                  Preferred viewing: {formatViewingTime(r.preferredViewingAt)}
                </p>
              )}
              {r.proposedViewingAt && (
                <p className="mt-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12.5px] font-medium text-blue-800">
                  <CalendarClock className="h-4 w-4" />
                  Alternative proposed: {formatViewingTime(r.proposedViewingAt)}
                  {r.viewingNote ? ` · ${r.viewingNote}` : ""}
                </p>
              )}
              {r.confirmedViewingAt && (
                <p className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-800">
                  <CalendarClock className="h-4 w-4" />
                  Viewing confirmed: {formatViewingTime(r.confirmedViewingAt)}
                  {r.viewingOutcome ? ` · ${r.viewingOutcome.replace(/_/g, " ")}` : ""}
                </p>
              )}
            </Card>

            {r.message && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-foundation-700">
                  {r.message}
                </p>
              </Card>
            )}

            {r.reservationFee != null && r.reservationFee > 0 && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Reservation fee
                </p>
                <p className="mt-2 font-display text-[22px] font-extrabold text-foundation-700">
                  {formatNgn(r.reservationFee)}
                </p>
                {r.paidAt && (
                  <p className="mt-1 text-[12px] text-ink-muted">
                    Paid {formatDate(r.paidAt)}
                  </p>
                )}
              </Card>
            )}

            {actionError && (
              <div className="mt-6">
                <ErrorBox message={actionError} />
              </div>
            )}

            {r.status === "pending" && !showDecline && !showPropose && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPropose(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                >
                  <CalendarClock className="h-4 w-4" /> Propose another time
                </button>
                <button
                  type="button"
                  onClick={() => setShowDecline(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-paper px-4 py-2 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <X className="h-4 w-4" /> Decline
                </button>
                <button
                  type="button"
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />{" "}
                  {approve.isPending ? "Confirming…" : r.preferredViewingAt ? "Confirm viewing" : "Approve"}
                </button>
              </div>
            )}

            {showPropose && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Propose another viewing time
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  The request stays pending. The prospect will be notified of your proposed time.
                </p>
                <label className="mt-4 block">
                  <span className="text-[12px] font-semibold text-foundation-700">Date and time</span>
                  <input
                    type="datetime-local"
                    required
                    value={proposedViewingAt}
                    min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                    onChange={(event) => setProposedViewingAt(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-[12px] font-semibold text-foundation-700">Note <span className="font-normal text-ink-muted">(optional)</span></span>
                  <textarea
                    value={viewingNote}
                    onChange={(event) => setViewingNote(event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="For example: Please meet at the estate gate."
                    className="mt-1.5 w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
                  />
                </label>
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPropose(false)}
                    className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => proposeViewing.mutate()}
                    disabled={proposeViewing.isPending || !proposedViewingAt}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    {proposeViewing.isPending ? "Sending…" : "Send proposed time"}
                  </button>
                </div>
              </Card>
            )}

            {showDecline && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Decline this reservation
                </p>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="Reason (optional), shown to the prospect"
                  className="mt-3 w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
                />
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDecline(false)}
                    className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => decline.mutate()}
                    disabled={decline.isPending}
                    className="rounded-full bg-red-600 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {decline.isPending ? "Declining…" : "Decline"}
                  </button>
                </div>
              </Card>
            )}

            {r.confirmedViewingAt && !r.viewingOutcome && (
              <Card className="mt-6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">After the viewing</p>
                <p className="mt-2 text-[13px] text-ink-muted">Record what happened so the prospect receives a clear update and your marketplace reporting stays accurate.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {([
                    ["completed", "Viewing completed"],
                    ["no_show", "Prospect did not attend"],
                    ["reschedule_needed", "Needs rescheduling"],
                  ] as const).map(([outcome, label]) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => recordOutcome.mutate(outcome)}
                      disabled={recordOutcome.isPending}
                      className="rounded-full border border-foundation-700/15 bg-paper px-3.5 py-2 text-[12px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}

function formatViewingTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
