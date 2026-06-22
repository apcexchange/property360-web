import { redirect } from "next/navigation";

/**
 * Onboarding entry. Server-redirects to the first interactive step,
 * forwarding `?ref=` (referral links) and `?role=` (e.g. ad landing pages
 * that pre-pick "agent") so the role page can act on them on mount.
 *
 * Next 15+: searchParams is a Promise on async server components.
 */
export default async function OnboardingIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const qs = new URLSearchParams();
  const ref = first(params?.ref);
  const role = first(params?.role);
  if (ref) qs.set("ref", ref);
  if (role) qs.set("role", role);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/onboarding/role${suffix}`);
}
