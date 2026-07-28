"use client";

import { useState } from "react";
import { authApi } from "@/lib/auth-api";
import { Card } from "@/components/app/ui";
import { AxiosError } from "axios";

export default function PartnerSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!currentPassword || !newPassword) {
      setError("Fill in your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          "Couldn't change your password. Check your current password and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold text-foundation-700">
        Settings
      </h1>

      <Card className="max-w-lg">
        <h2 className="font-display text-lg font-bold text-foundation-700">
          Change password
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          If you signed in with a temporary password from your invitation
          email, set your own password here.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              placeholder="At least 6 characters"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              placeholder="Re-enter new password"
            />
          </Field>

          {error && (
            <p className="border border-error/30 bg-error/5 px-3 py-2 text-[12.5px] text-error">
              {error}
            </p>
          )}
          {done && (
            <p className="border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
              Password updated.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 bg-foundation-700 px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-paper transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </Card>
    </main>
  );
}

const inputCls =
  "block w-full border-0 border-b border-rule-strong bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-foundation-700";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
