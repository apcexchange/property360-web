"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { PageContainer, Card, ErrorBox } from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

export default function InviteLandlordPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");

  const invite = useMutation({
    mutationFn: () => landlordApi.inviteLandlord({ email: email.trim() }),
    onSuccess: () => {
      const sentTo = email.trim();
      toast.success({
        title: "Invitation sent",
        body: `We emailed ${sentTo} a link to accept.`,
      });
      router.push("/app/landlords");
    },
    onError: (err) => {
      const e = err as AxiosError<{ message?: string }>;
      const msg = e.response?.data?.message ?? (err as Error).message;
      toast.error({ title: "Could not send invitation", body: msg });
    },
  });

  const formError = (() => {
    if (!invite.isError) return null;
    const err = invite.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim());

  return (
    <>
      <AppTopbar
        title="Invite landlord"
        subtitle="Ask a landlord to let you manage their properties"
        actions={
          <Link
            href="/app/landlords"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) invite.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Landlord
            </h2>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="landlord@example.com"
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              />
              <p className="mt-2 text-[11.5px] text-ink-muted">
                If they don&apos;t have an account, they&apos;ll be prompted to
                create one when they accept. They&apos;ll choose which
                properties you can manage and what permissions you have.
              </p>
            </div>
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/landlords"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || invite.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {invite.isPending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}
