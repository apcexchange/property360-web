"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyEmailPreference, EmailPrefAction } from "@/lib/email-prefs-api";

interface Copy {
  loading: string;
  doneTitle: string;
  doneBody: string;
}

const COPY: Record<EmailPrefAction, Copy> = {
  unsubscribe: {
    loading: "Unsubscribing…",
    doneTitle: "You're unsubscribed",
    doneBody:
      "You won't get any more tips, offers or follow-up emails from Property360. Account emails such as receipts and security codes still arrive as normal.",
  },
  "opt-in": {
    loading: "Saving your choice…",
    doneTitle: "You're on the list",
    doneBody:
      "We'll send you occasional tips for landlords and the odd offer. Every email has a one-click unsubscribe link.",
  },
};

function EmailPreferenceInner({ action }: { action: EmailPrefAction }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "done" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState<string | undefined>(undefined);
  // The endpoint changes state (unsubscribes or opts in), so it must run
  // exactly once per page load, not twice under React 19 Strict Mode's
  // mount, effect, cleanup, effect double-invoke in development.
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    // The token is a one-click credential: get it out of the URL bar (and
    // so out of browser history and any later copy/share of the link)
    // straight after we've read it, before the request even resolves.
    window.history.replaceState(null, "", window.location.pathname);
    applyEmailPreference(action, token).then((res) => {
      setMessage(res.message);
      setState(res.ok ? "done" : "error");
    });
  }, [action, token]);

  const copy = COPY[action];
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-tight text-foundation-700">
        {state === "loading" ? copy.loading : state === "done" ? copy.doneTitle : "This link didn't work"}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {state === "done"
          ? copy.doneBody
          : state === "error"
          ? `${message ?? "The link may be incomplete or out of date."} Email hello@property360.africa and we'll sort it out.`
          : "One moment."}
      </p>
      <Link href="/" className="mt-6 text-[14px] font-semibold text-cryola-500 hover:underline">
        Back to property360.africa
      </Link>
    </main>
  );
}

/** Confirmation page for the signed links in sales emails. */
export function EmailPreferencePage({ action }: { action: EmailPrefAction }) {
  return (
    <Suspense fallback={null}>
      <EmailPreferenceInner action={action} />
    </Suspense>
  );
}
