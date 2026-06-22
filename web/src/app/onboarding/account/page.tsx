"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { useOnboardingState } from "@/lib/onboarding-state";
import { authApi } from "@/lib/auth-api";
import { trackMeta } from "@/lib/meta-pixel";
import { AxiosError } from "axios";

export default function AccountPage() {
  const router = useRouter();
  const { state, update, ready } = useOnboardingState();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!state.role) {
      router.replace("/onboarding/role");
      return;
    }
    if (state.firstName) setFirstName(state.firstName);
    if (state.lastName) setLastName(state.lastName);
    if (state.email) setEmail(state.email);
    if (state.phone) setPhone(state.phone);
    if (state.referralCode) {
      setReferralCode(state.referralCode);
      setReferralOpen(true);
    }
  }, [ready, state, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!state.role) return;
    setSubmitting(true);
    setError(null);
    try {
      const normalizedPhone = phone.trim().startsWith("+")
        ? phone.trim()
        : phone.trim().startsWith("0")
        ? `+234${phone.trim().slice(1)}`
        : `+234${phone.trim()}`;

      const trimmedRef = referralCode.trim().toUpperCase();

      await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
        role: state.role,
        ...(trimmedRef ? { referralCode: trimmedRef } : {}),
      });
      update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        referralCode: trimmedRef || undefined,
        registered: true,
      });
      // The account now exists — the conversion event. Pass user data so the
      // server relay can hash it for high match quality on the Conversions API.
      trackMeta(
        "CompleteRegistration",
        { content_name: state.role, content_category: "signup", status: true },
        {
          email: email.trim().toLowerCase(),
          phone: normalizedPhone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }
      );
      router.push("/onboarding/verify");
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't create your account.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell
      currentStep="account"
      includesPlan={state.role === "landlord"}
    >
      <p className="eyebrow">Step 2</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Create your account.
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        Use the same email and password to sign into the mobile app when you&apos;re
        ready.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="First name"
            value={firstName}
            onChange={setFirstName}
            required
            autoComplete="given-name"
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={setLastName}
            required
            autoComplete="family-name"
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="Phone (Nigerian)"
          type="tel"
          value={phone}
          onChange={setPhone}
          required
          autoComplete="tel"
          placeholder="0801 234 5678"
          help="We'll prefix +234 automatically."
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
          help="At least 6 characters."
        />

        {referralOpen ? (
          <Field
            label="Referral code (optional)"
            value={referralCode}
            onChange={(v) => setReferralCode(v.toUpperCase())}
            autoComplete="off"
            placeholder="e.g. ABC23K7P"
            help="Both of you get 30 days free when you add your first property."
          />
        ) : (
          <button
            type="button"
            onClick={() => setReferralOpen(true)}
            className="text-[12.5px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Have a referral code?
          </button>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Link
            href="/onboarding/role"
            className="text-[13px] font-semibold text-ink-muted transition hover:text-foundation-700"
          >
            ← Back
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Continue →"}
          </button>
        </div>
      </form>

      <p className="mt-10 text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
        >
          Sign in
        </Link>
        .
      </p>

      <p className="mt-4 text-[12px] leading-[1.5] text-ink-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline decoration-cryola-400 underline-offset-4">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline decoration-cryola-400 underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    </OnboardingShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow block text-[10px]">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-4 py-2.5 text-[14.5px] text-foundation-700 outline-none transition focus:border-foundation-700/40"
      />
      {help && (
        <span className="mt-1 block text-[11.5px] text-ink-muted">{help}</span>
      )}
    </label>
  );
}
