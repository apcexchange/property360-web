"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { FOUNDING, naira, foundingSaving } from "./foundingOffer";
import { getFoundingStatus, joinFoundingWaitlist, FoundingStatus } from "@/lib/founding-api";
import { billingApi } from "@/lib/billing-api";
import { session } from "@/lib/session";

/**
 * "The Founding 50" launch section, the irresistible offer as a dark,
 * high-contrast block. Reads the LIVE slot count from the backend, drives the
 * founding checkout, and flips to a waitlist once all slots are claimed.
 * Anchored at #founding so the FoundingBar can deep-link to it.
 */
export function Founding50() {
  const router = useRouter();
  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFoundingStatus().then(setStatus);
  }, []);

  const claimed = status?.claimed ?? 0;
  const total = status?.total ?? FOUNDING.slots;
  const remaining = status ? status.remaining : FOUNDING.slots;
  const soldOut = !!status && status.enabled && status.remaining <= 0;
  const showCounter = !!status && claimed > 0 && !soldOut;

  async function handleClaim() {
    setError(null);
    const user = session.getUser();
    // Logged-in landlords/agents go straight to founding checkout. Everyone
    // else runs the normal signup → onboarding flow with the founding flag,
    // which lands them on the same checkout once registered.
    if (user && (user.role === "landlord" || user.role === "agent")) {
      setClaiming(true);
      try {
        const { authorizationUrl } = await billingApi.createCheckout("founding", "annual");
        window.location.href = authorizationUrl;
      } catch (err) {
        const ax = err as AxiosError<{ message?: string }>;
        if (ax.response?.status === 409) {
          // Slots filled between page load and click, refresh to sold-out.
          setStatus((s) => (s ? { ...s, remaining: 0, claimed: s.total } : s));
        } else {
          setError(ax.response?.data?.message ?? "Could not start checkout. Try again.");
        }
        setClaiming(false);
      }
    } else {
      router.push("/onboarding?founding=1");
    }
  }

  return (
    <section
      id="founding"
      className="relative overflow-hidden bg-foundation-700 py-24 text-paper sm:py-28"
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-cryola-300/15 blur-3xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#BFFF84_1px,transparent_1px),linear-gradient(to_bottom,#BFFF84_1px,transparent_1px)] [background-size:96px_96px]"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Copy column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cryola-300/25 bg-foundation-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cryola-300">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-cryola-300" />
            {soldOut ? "Founding 50 · closed" : `Launch offer · limited to ${total}`}
          </div>

          <h2 className="mt-6 font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {soldOut ? (
              <>All {total} founding spots are <span className="draw-underline">claimed.</span></>
            ) : (
              <>Be one of the first <span className="draw-underline">{total} landlords.</span></>
            )}
          </h2>

          <p className="mt-6 max-w-xl text-[16.5px] leading-[1.55] text-paper/75">
            {soldOut ? (
              <>
                The founding cohort is full, thank you to everyone who joined.
                Leave your email and you&apos;ll be first to hear about the next
                landlord offer.
              </>
            ) : (
              <>
                The first {total} landlords to join become{" "}
                <span className="font-semibold text-paper">Founding Landlords</span>{" "}
, locked into our best price forever, with white-glove setup and a
                direct line to the team. When the {total} slots are gone, the
                founding price is gone.
              </>
            )}
          </p>

          {!soldOut && (
            <ul className="mt-8 space-y-3">
              {FOUNDING.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-[15px] leading-snug text-paper/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cryola-300" strokeWidth={2.5} />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          )}

          {!soldOut && (
            <p className="mt-7 text-[13.5px] text-paper/60">
              <span className="font-semibold text-cryola-300">Agents:</span> bring
              3 landlords during launch and get Agency free for 6 months.
            </p>
          )}
        </motion.div>

        {/* Offer / waitlist card column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-cryola-300/20 bg-foundation-800/80 p-7 shadow-pop backdrop-blur-sm sm:p-9"
        >
          {soldOut ? (
            <WaitlistCard />
          ) : (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cryola-300">
                Founding {FOUNDING.tier}
              </p>

              <div className="mt-4 flex items-end gap-3">
                <p className="font-display text-[clamp(2.75rem,7vw,3.5rem)] font-extrabold leading-none tracking-[-0.02em]">
                  {naira(FOUNDING.foundingAnnualNgn)}
                </p>
                <span className="pb-1.5 text-[15px] font-medium text-paper/65">/year</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-paper/55 line-through">
                  {naira(FOUNDING.normalAnnualNgn)}/yr
                </span>
                <span className="rounded-full bg-cryola-300/15 px-2 py-0.5 font-semibold text-cryola-300">
                  Save {naira(foundingSaving)} · locked forever
                </span>
              </div>

              {showCounter ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[12px] text-paper/70">
                    <span>{remaining} of {total} slots left</span>
                    <span>{claimed} claimed</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
                    <div
                      className="h-full rounded-full bg-cryola-300 transition-all"
                      style={{ width: `${(claimed / total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-[13px] text-paper/70">
                  <span className="font-semibold text-paper">{total} slots</span>{" "}
                  total. First come, first served.
                </p>
              )}

              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cryola-300 px-6 py-3.5 text-[15px] font-semibold text-foundation-800 transition hover:bg-cryola-200 disabled:opacity-60"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting checkout…
                  </>
                ) : (
                  <>
                    Claim your founding spot
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {error && (
                <p className="mt-3 text-center text-[12.5px] text-warning">{error}</p>
              )}
              <p className="mt-4 text-center text-[12px] text-paper/55">
                Secure Paystack checkout · annual billing
              </p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/** Post-sellout email capture. */
function WaitlistCard() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const { ok, message } = await joinFoundingWaitlist(email.trim());
    if (ok) {
      setState("done");
    } else {
      setState("error");
      setMsg(message ?? "Something went wrong, try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <Check className="mx-auto h-8 w-8 text-cryola-300" strokeWidth={2.5} />
        <p className="mt-3 font-display text-[20px] font-extrabold">You&apos;re on the list.</p>
        <p className="mt-2 text-[13.5px] text-paper/70">
          We&apos;ll email you first when the next offer opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cryola-300">
        Join the waitlist
      </p>
      <p className="mt-3 text-[14px] text-paper/75">
        Be first in line for the next landlord offer.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="mt-5 w-full rounded-full border border-cryola-300/20 bg-foundation-700 px-5 py-3.5 text-[15px] text-paper placeholder:text-paper/40 focus:border-cryola-300/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cryola-300 px-6 py-3.5 text-[15px] font-semibold text-foundation-800 transition hover:bg-cryola-200 disabled:opacity-60"
      >
        {state === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Joining…
          </>
        ) : (
          "Notify me"
        )}
      </button>
      {state === "error" && msg && (
        <p className="mt-3 text-center text-[12.5px] text-warning">{msg}</p>
      )}
    </form>
  );
}
