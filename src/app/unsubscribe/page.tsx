"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/newsletter-api";

function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!email) {
      setState("error");
      return;
    }
    unsubscribeNewsletter(email).then((res) => setState(res.ok ? "done" : "error"));
  }, [email]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-tight text-foundation-700">
        {state === "loading" ? "Unsubscribing…" : state === "done" ? "You're unsubscribed" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {state === "done"
          ? `${email} won't receive any more newsletter emails. Changed your mind? You can resubscribe from any form on our site.`
          : state === "error"
          ? "We couldn't process that unsubscribe link. Email hello@property360.africa and we'll sort it out."
          : "One moment."}
      </p>
      <a href="/" className="mt-6 text-[14px] font-semibold text-cryola-500 hover:underline">
        Back to property360.africa
      </a>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
