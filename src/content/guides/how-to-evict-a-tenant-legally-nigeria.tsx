import { guideSources } from "./sources";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "how-to-evict-a-tenant-legally-nigeria",
  coverImage: guidePhotos.keys,
  title: "Recovering a Rented Property in Nigeria: What to Prepare",
  heading: "Recovering possession of a rental: what to prepare",
  description:
    "Understand notices, records and state-specific legal steps for recovering possession in Nigeria. Learn what to check with a local lawyer before serving notice.",
  keywords: [
    "how to evict a tenant in Nigeria",
    "quit notice Nigeria",
    "notice to quit",
    "eviction process Nigeria",
    "tenancy law Lagos",
  ],
  datePublished: "2026-06-23",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Legal",
  author: "Property360 Editorial Team",
  articleImage: {
    src: "/images/guides/generated/article-eviction.webp",
    alt: "Rows of legal books on a library shelf.",
    caption:
      "Check the agreement and state-specific legal process before acting.",
  },
  scopeNote:
    "Use this guide to prepare for local legal advice. Required notices, service methods, possession proceedings and remedies depend on the property and circumstances.",
  standfirst:
    "Eviction is a legal process, not a lock change. Start with the agreement and the applicable state law, preserve evidence of service, and get state-specific legal advice before acting.",
  tags: ["eviction", "quit notice", "tenant rights"],
  takeaways: [
    {
      title: "The agreement is the starting record",
      body: "Identify the tenancy type, parties, property and any notice terms before writing to the tenant. A lawyer can then assess the state-specific process.",
    },
    {
      title: "Document, do not escalate",
      body: "Keep rent records, communications and proof of service. Do not use lockouts, threats, removal of belongings or service disconnection to force an outcome.",
    },
  ],
  faqs: [
    {
      question: "Can a landlord change the locks when rent is unpaid?",
      answer:
        "Do not assume that is lawful. Recovery of possession is governed by the applicable law and court process; self-help can create serious liability. Get legal advice in the property's state.",
    },
    {
      question: "Does a missed payment end a tenancy automatically?",
      answer:
        "Not necessarily. The agreement, the facts and the applicable law matter. Preserve the payment record and obtain advice before taking steps to recover possession.",
    },
  ],
  sources: [guideSources.tenancyLaw],
  checklist: [
    "Read the current tenancy agreement and identify the applicable state.",
    "Ask a qualified lawyer to confirm the required notice and service process.",
    "Keep dated copies of notices and evidence of how they were served.",
    "Do not change locks, remove belongings, disconnect services, or threaten a tenant.",
    "Use the court process where required; do not attempt self-help eviction.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        When a landlord seeks possession of a rented home, the first useful step
        is to establish the facts and the applicable procedure. A tenant
        receiving a demand to leave needs the same information. Start with a
        dated tenancy file and take it to a property lawyer familiar with the
        state where the home is located.
      </p>

      <h2>Build a timeline before drafting a notice</h2>
      <p>
        Record when occupation began, the agreed term, the payment frequency and
        any renewal or variation. Include the signed agreement if there is one,
        but also keep receipts and messages explaining the arrangement. Where
        the documents conflict, identify the disagreement for the lawyer rather
        than editing an old record to make it fit.
      </p>
      <p>
        Describe the reason possession is sought in factual terms: an alleged
        unpaid amount, an approaching end date or a particular disputed
        obligation. Avoid labels such as &ldquo;bad tenant&rdquo;. They do not
        explain what happened, and they make a practical discussion harder.
      </p>

      <h2>Reconcile any alleged arrears</h2>
      <p>
        Compare the rent ledger with bank or provider records. Check the tenant,
        property, amount and period for every payment, including money paid
        early or allocated to the wrong invoice. Separate rent from service
        charges and other disputed amounts. Ask the tenant for the reference of
        a payment they say is missing and record the outcome of the check.
      </p>
      <p>
        For example, a transfer received in September might cover an agreed
        period starting in November. Treating the transfer date as its coverage
        date can produce a false overdue balance. The
        <Link href="/guides/what-happens-when-rent-is-paid-early">
          {" "}
          early-payment guide
        </Link>{" "}
        explains how to keep those dates separate.
      </p>

      <h2>Have the notice and service requirements checked</h2>
      <p>
        Ask the lawyer which notices are required, who can issue them, how dates
        are calculated and what evidence of service is needed. A monthly,
        yearly, fixed-term or disputed occupation may raise different questions.
        Copying a notice used for a different property can introduce the wrong
        names, expiry date or legal basis.
      </p>
      <p>
        Sections 13–19 and 24 of the published Lagos Tenancy Law 2011 address
        notices, service and possession proceedings. That dated Lagos text is a
        reference to assess for applicability, not a nationwide sequence to
        copy.
      </p>
      <p>
        Preserve the actual document served and the service record supplied by
        the person handling it. A screenshot showing that a message was read
        does not establish every legal requirement. Ask the professional
        conducting the matter what evidence should be retained.
      </p>

      <h2>Prepare an organised file for legal advice</h2>
      <ul>
        <li>The property address, unit and the parties&apos; full names.</li>
        <li>The agreement, amendments and any earlier renewal documents.</li>
        <li>A dated timeline and reconciled payment record.</li>
        <li>Relevant correspondence, notices and service evidence.</li>
        <li>
          A concise list of disputed facts and the outcome each party seeks.
        </li>
      </ul>
      <p>
        Ask about the appropriate forum, available settlement options, likely
        stages and costs, and the next date that needs attention. Keep a note of
        the advice and the agreed instructions. If a court process is required,
        ask who will handle filing, attendance and any enforcement steps.
      </p>

      <h2>Keep communications calm and factual</h2>
      <p>
        Use the agreed contact channel to discuss the account and practical
        arrangements. Do not use threats, public shaming, removed belongings,
        changed locks or disconnected services to obtain possession. A disputed
        payment needs investigation and legal advice, rather than pressure on
        the occupant.
      </p>
      <p>
        If the parties discuss a voluntary departure, record the proposed date,
        keys, inspection, outstanding money and deposit accounting. Ask a lawyer
        to check the settlement before treating a message or returned key as a
        complete resolution. Avoid promising a completion date for a legal
        process you cannot control.
      </p>

      <h2>If you are the tenant receiving a notice</h2>
      <p>
        Save the notice and record when and how it arrived. Compare its names,
        address and dates with your records, and seek local legal advice
        promptly. Provide proof of disputed payments and any relevant
        correspondence. Do not assume an online guide can decide the
        notice&apos;s validity or replace a response required in an actual
        proceeding.
      </p>
    </>
  );
}
