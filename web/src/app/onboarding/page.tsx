import { redirect } from "next/navigation";

/**
 * Onboarding entry. Server-redirects to the first interactive step,
 * forwarding any query string (notably `?ref=` from referral links) so
 * the role page can stash the code into onboarding state on mount.
 *
 * Next 15+: searchParams is a Promise on async server components.
 */
export default async function OnboardingIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ref = params?.ref;
  const refValue = Array.isArray(ref) ? ref[0] : ref;
  const qs = refValue ? `?ref=${encodeURIComponent(refValue)}` : "";
  redirect(`/onboarding/role${qs}`);
}
