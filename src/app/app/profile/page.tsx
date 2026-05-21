"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { KeyRound, ShieldCheck, User } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
} from "@/components/app/ui";
import { session } from "@/lib/session";
import { landlordApi } from "@/lib/landlord-api";

export default function ProfilePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => landlordApi.profile(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (q.data) {
      setFirstName(q.data.firstName ?? "");
      setLastName(q.data.lastName ?? "");
      setEmail(q.data.email ?? "");
      setPhone(q.data.phone ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      landlordApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (u) => {
      const token = session.getToken();
      if (token) session.set(token, { ...u, role: u.role });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const saveError = (() => {
    if (!save.isError) return null;
    const err = save.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <AppTopbar title="Profile" subtitle="Your name, contact info, and security" />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-5 p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-foundation-700" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Personal details
              </h2>
            </div>
            {q.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : q.isError ? (
              <ErrorBox
                message={(q.error as Error)?.message}
                onRetry={() => q.refetch()}
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input value={firstName} onChange={setFirstName} />
                  </Field>
                  <Field label="Last name">
                    <Input value={lastName} onChange={setLastName} />
                  </Field>
                  <Field label="Email">
                    <Input value={email} onChange={setEmail} type="email" />
                  </Field>
                  <Field label="Phone">
                    <Input value={phone} onChange={setPhone} />
                  </Field>
                </div>
                {saveError && <ErrorBox message={saveError} />}
                {save.isSuccess && (
                  <p className="text-[12.5px] text-emerald-700">
                    Profile updated.
                  </p>
                )}
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={save.isPending}
                    className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                  >
                    {save.isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </Card>

          <div className="space-y-3">
            <Link
              href="/app/profile/password"
              className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
            >
              <KeyRound className="mt-0.5 h-4 w-4 text-foundation-700" />
              <div>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Change password
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  Update your sign-in password
                </p>
              </div>
            </Link>
            <Link
              href="/app/profile/kyc"
              className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 text-foundation-700" />
              <div>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Identity verification
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  Selfie + government ID
                </p>
              </div>
            </Link>
          </div>
        </div>
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
  type?: "text" | "email";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
    />
  );
}
