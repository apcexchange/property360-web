"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import { tenantApi, TenantInviteRelationship } from "@/lib/tenant-api";

const inputCls =
  "w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700";

/**
 * "Invite my landlord/caretaker". Saves the invite first (so the backend's
 * duplicate and daily limits apply), then opens WhatsApp with the message the
 * backend wrote. With no number, WhatsApp lets the tenant pick the contact.
 */
export function InviteForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const [relationship, setRelationship] = useState<TenantInviteRelationship>("landlord");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () =>
      tenantApi.createReferralInvite({
        relationship,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onMutate: () => {
      setLastWhatsappUrl(null);
    },
    onSuccess: (res) => {
      window.open(res.whatsappUrl, "_blank", "noopener");
      setLastWhatsappUrl(res.whatsappUrl);
      qc.invalidateQueries({ queryKey: ["me", "referrals"] });
      setName("");
      setPhone("");
      toast.success("Invite saved. Send the message in WhatsApp.");
    },
  });

  const error = invite.isError
    ? ((invite.error as AxiosError<{ message?: string }>).response?.data?.message ??
      (invite.error as Error).message)
    : null;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foundation-700">
          Invite my landlord or caretaker
        </h2>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          We open WhatsApp with a message ready to send. Add their number and we&apos;ll also
          send them a reminder from Property360.
        </p>
      </div>

      <div className="flex gap-2">
        {(["landlord", "caretaker"] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={relationship === r}
            onClick={() => setRelationship(r)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
              relationship === r
                ? "bg-foundation-700 text-paper"
                : "border border-foundation-700/15 bg-paper text-foundation-700 hover:bg-foundation-700/5"
            }`}
          >
            {r === "landlord" ? "Landlord" : "Caretaker"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Their name (optional)"
          aria-label="Their name"
          value={name}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            invite.reset();
          }}
        />
        <input
          className={inputCls}
          placeholder="WhatsApp number (optional)"
          aria-label="Their WhatsApp number"
          type="tel"
          inputMode="tel"
          value={phone}
          maxLength={20}
          onChange={(e) => {
            setPhone(e.target.value);
            invite.reset();
          }}
        />
      </div>

      {error && <p className="text-[12.5px] text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={invite.isPending}
          onClick={() => invite.mutate()}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          {invite.isPending ? "Saving…" : "Send on WhatsApp"}
        </button>
        {lastWhatsappUrl && (
          <a
            href={lastWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12.5px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Open WhatsApp again
          </a>
        )}
      </div>
    </Card>
  );
}
