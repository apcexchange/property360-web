"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import { PageContainer, Card, ErrorBox } from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const change = useMutation({
    mutationFn: () =>
      landlordApi.changePassword({
        currentPassword: current,
        newPassword: next,
      }),
    onSuccess: () => router.push("/app/profile"),
  });

  const formError = (() => {
    if (next.length > 0 && confirm.length > 0 && next !== confirm) {
      return "New password and confirmation don't match.";
    }
    if (!change.isError) return null;
    const err = change.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    !change.isPending;

  return (
    <>
      <AppTopbar
        title="Change password"
        actions={
          <Link
            href="/app/profile"
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
            if (canSubmit) change.mutate();
          }}
        >
          <Card className="space-y-4 p-5">
            <Field label="Current password">
              <Input value={current} onChange={setCurrent} type="password" />
            </Field>
            <Field label="New password">
              <Input value={next} onChange={setNext} type="password" />
              <p className="mt-1 text-[11.5px] text-ink-muted">
                At least 8 characters.
              </p>
            </Field>
            <Field label="Confirm new password">
              <Input value={confirm} onChange={setConfirm} type="password" />
            </Field>
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/profile"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {change.isPending ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={type === "password" ? "new-password" : undefined}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
    />
  );
}
