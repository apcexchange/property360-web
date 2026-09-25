/**
 * Pure helper behind /login's `?next=` redirect, extracted so it's testable
 * in isolation. This repo has no test runner yet; if one is added later,
 * the cases documented below are the contract this function must satisfy
 * (verified against Node's WHATWG URL implementation, which browsers share):
 *
 * Must be REJECTED (falls back to the role's default landing page), even
 * though each of these starts with what looks like a single safe "/":
 *   - "//evil.com"                                  protocol-relative: new URL()
 *                                                    resolves this to origin
 *                                                    "http://evil.com" directly.
 *   - "/\\evil.com"                                 for a special scheme (http),
 *                                                    a backslash right after the
 *                                                    leading "/" is normalized the
 *                                                    same as "//evil.com" by the
 *                                                    URL parser: origin becomes
 *                                                    "http://evil.com" too.
 *   - "/a/..//evil.com"                             dot-segment removal collapses
 *                                                    "/a/.." to "", leaving a
 *                                                    pathname of "//evil.com"
 *                                                    (origin stays same-site, but
 *                                                    a leading "//" in the string
 *                                                    we hand back would itself be
 *                                                    read as protocol-relative the
 *                                                    next time it's used as a href
 *                                                    or fed into another URL()).
 *   - "/.//evil.com"                                 same mechanism as above.
 *   - "/app/billing/../..//evil.com?plan=x"          same, from deeper in the tree;
 *                                                    also confirms the check must
 *                                                    run on the OUTPUT path, not
 *                                                    just reject "/a/.." patterns.
 *   - "/app\\..\\\\evil.com"                         backslash-normalized traversal,
 *                                                    also collapses to "//evil.com".
 *
 * Must be ALLOWED (ordinary same-origin app paths):
 *   - "/app/billing?plan=pro&interval=annual"        -> unchanged (plan preselect)
 *   - "/app/dashboard"                                -> unchanged
 *   - "/me", "/me/lease", "/listings", "/listings/42" -> unchanged (tenant paths)
 */

const DEFAULT_LANDLORD_PATH = "/app/dashboard";
const DEFAULT_TENANT_PATH = "/me";

/**
 * Parses `raw` as a `next` redirect target. Returns null (caller falls back
 * to a safe default) unless it is a same-origin, single-leading-slash path
 * whose resolved pathname+search also can't itself be read as
 * protocol-relative or normalized into a host change downstream.
 */
function parseSameOriginNext(raw: string | null | undefined, origin: string): URL | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;

  let u: URL;
  try {
    u = new URL(raw, origin);
  } catch {
    return null;
  }

  // Layer 1: the parsed URL must resolve to our own origin (catches
  // "//evil.com" and the backslash-at-the-start variant, both of which
  // change the parsed host, not just the path).
  if (u.origin !== origin) return null;
  if (u.pathname.startsWith("//")) return null;

  // Layer 2 (belt and suspenders): re-check the literal string we're about
  // to hand back to the caller. Even same-origin, a value that starts with
  // "//" or still carries a backslash could be misread as protocol-relative
  // (or normalized into a host change) the next time something puts it into
  // an <a href>, router.replace, or another `new URL(...)` call.
  const out = u.pathname + u.search;
  if (out.startsWith("//") || out.includes("\\")) return null;

  return u;
}

/**
 * Resolves the `next` query param into a redirect target for the given
 * role, or that role's default landing page if `next` is missing, malformed,
 * or points off-site. `origin` should be `window.location.origin` (the
 * caller's, since this only ever runs client-side).
 */
export function safeNextPath(raw: string | null | undefined, origin: string, role: string): string {
  if (role === "partner") return "/partner";

  const fallback = role === "tenant" ? DEFAULT_TENANT_PATH : DEFAULT_LANDLORD_PATH;
  const u = parseSameOriginNext(raw, origin);
  if (!u) return fallback;

  if (role === "tenant") {
    if (u.pathname.startsWith("/me") || u.pathname.startsWith("/listings")) {
      return u.pathname + u.search;
    }
    return DEFAULT_TENANT_PATH;
  }

  // Landlords/agents bounced here from an expired /app/billing session
  // (incl. a failed mobile web-handoff) land on the dashboard instead of
  // straight back on billing, that page is a rarer destination than the
  // dashboard and shouldn't be where a normal sign-in dumps you.
  // Exception: a plan link (?plan=...) from the sales assistant or an
  // email should land on billing with that plan preselected.
  if (u.pathname === "/app/billing") {
    return u.searchParams.has("plan") ? "/app/billing" + u.search : DEFAULT_LANDLORD_PATH;
  }
  return u.pathname + u.search;
}
