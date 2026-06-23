import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "how-to-evict-a-tenant-legally-nigeria",
  title: "How to Legally Evict a Tenant in Nigeria (Quit Notice Explained)",
  heading: "How to legally evict a tenant in Nigeria",
  description:
    "A landlord's guide to the legal eviction process in Nigeria: the notice to quit, notice periods, the seven-day notice, and the mistakes that get cases thrown out.",
  keywords: [
    "how to evict a tenant in Nigeria",
    "quit notice Nigeria",
    "notice to quit",
    "eviction process Nigeria",
    "tenancy law Lagos",
  ],
  datePublished: "2026-06-23",
  readingMinutes: 7,
  category: "Legal",
};

export function Body() {
  return (
    <>
      <p>
        Removing a tenant who will not leave or will not pay is one of the hardest
        situations a landlord faces. The temptation is to change the locks or cut
        the power, but self-help eviction is illegal in Nigeria and can land the
        landlord in trouble instead of the tenant. Eviction has to follow a legal
        process. Here is how it works in plain terms.
      </p>

      <h2>The golden rule: no self-help</h2>
      <p>
        You cannot lawfully force a tenant out by locking them out, removing their
        belongings, cutting off services, or using threats. Doing so can expose you
        to liability. Eviction in Nigeria runs through proper notices and, if
        needed, the court.
      </p>

      <h2>Step 1: Serve a notice to quit</h2>
      <p>
        The process usually begins with a notice to quit, which formally tells the
        tenant the tenancy is ending and they must give up the property. The length
        of notice required depends on the type of tenancy:
      </p>
      <ul>
        <li>A monthly tenant is generally entitled to one month&apos;s notice.</li>
        <li>A quarterly tenant is generally entitled to one quarter&apos;s notice.</li>
        <li>A yearly tenant is generally entitled to six months&apos; notice.</li>
      </ul>
      <p>
        These periods can be varied by what the tenancy agreement says, which is
        one more reason a clear written agreement matters. The exact rules also
        depend on the state, and Lagos in particular has its own tenancy law.
      </p>

      <h2>Step 2: Serve a seven-day notice of owner&apos;s intention</h2>
      <p>
        If the tenant stays past the notice to quit, the next step is typically a
        seven-day notice of the owner&apos;s intention to apply to recover
        possession. This warns the tenant that court action is coming.
      </p>

      <h2>Step 3: Apply to court</h2>
      <p>
        If the tenant still does not leave, the landlord applies to the appropriate
        court to recover possession. The court hears the matter and, where the
        landlord is entitled, issues an order for possession that is enforced
        through the proper officers, not by the landlord personally.
      </p>

      <h2>Common mistakes that get cases thrown out</h2>
      <ul>
        <li>Giving the wrong length of notice for the type of tenancy.</li>
        <li>Skipping a required notice stage.</li>
        <li>Not keeping proof that each notice was actually served.</li>
        <li>Resorting to self-help while the process is ongoing.</li>
        <li>Having no written tenancy agreement to rely on.</li>
      </ul>

      <h2>Prevention beats eviction</h2>
      <p>
        Most eviction cases trace back to rent that quietly fell behind and a
        landlord who noticed too late. The earlier you spot arrears, the more
        options you have to resolve it before it becomes a court matter.
      </p>
      <p>
        This is where good records help. With{" "}
        <Link href="/landlord">Property360</Link>, you can see at a glance who has
        paid and who is owing, keep the signed tenancy agreement attached to the
        lease, and serve a quit notice from the same place you manage the tenant.
        When you do need to act, your paper trail is already in order.
      </p>

      <p className="text-[14px] text-ink-muted">
        Important: this article is general information, not legal advice. Tenancy
        law in Nigeria varies by state and changes over time. Before starting an
        eviction, consult a qualified lawyer in your state.
      </p>
    </>
  );
}
