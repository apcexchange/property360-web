import { guideSources } from "./sources";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "rent-increase-rules-nigeria",
  coverImage: guidePhotos.apartment,
  title: "Rent Increase Rules in Nigeria",
  heading: "Rent increases in Nigeria: what to check before agreeing",
  description:
    "Learn what to check before a Nigerian rent review: your agreement, notice terms, comparable homes, service charges and state-specific remedies.",
  keywords: [
    "rent increase Nigeria",
    "how much can a landlord increase rent",
    "rent review Nigeria",
    "unreasonable rent increase",
    "rent increase notice",
  ],
  datePublished: "2026-06-23",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Leases",
  author: "Property360 Editorial Team",
  articleImage: {
    src: "/images/guides/generated/article-rent-increase.webp",
    alt: "A calculator placed on financial paperwork.",
    caption:
      "Compare the proposed rent with current, like-for-like homes and check your agreement.",
  },
  scopeNote:
    "A practical framework for a rent-review discussion. The applicable agreement and local law determine notice requirements, remedies and whether a proposed change can take effect.",
  standfirst:
    "Start with the current agreement, then assess the proposed amount, dates and services. A clear comparison makes the discussion easier without treating a market figure as a legal rule.",
  tags: ["rent increase", "lease renewal", "Lagos tenancy law"],
  takeaways: [
    {
      title: "Separate the current term from renewal",
      body: "A paid fixed term and a proposed renewal are different questions. Check the agreement before presenting a new figure or accepting one.",
    },
    {
      title: "Show the basis for the conversation",
      body: "Use comparable current homes, service level, condition and lease history—not only an assertion that the market has changed.",
    },
  ],
  faqs: [
    {
      question: "Can rent change during a paid fixed term?",
      answer:
        "The signed agreement and the applicable state law govern this. A landlord or tenant should not assume a mid-term change is valid without checking both.",
    },
    {
      question: "What should a rent-review notice include?",
      answer:
        "State the property, current rent, proposed rent, effective date, response date and whether any other lease terms are changing. Keep a copy and proof it was sent.",
    },
  ],
  sources: [guideSources.tenancyLaw],
  checklist: [
    "Check the rent-review clause and the fixed term in the signed agreement.",
    "Confirm the current rules that apply in the property's state.",
    "Share any proposed new rent and effective date in writing before renewal.",
    "Keep a copy of the notice and the tenant's response.",
    "Ask a qualified lawyer about a contested or unusually large increase.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        A rent-review message needs more than a new figure. Establish which
        property and rental period it concerns, what the existing agreement says
        and when a response is needed. Those details help a landlord and tenant
        discuss the proposal without confusing it with the amount already agreed
        for the current term.
      </p>

      <h2>Identify the current arrangement first</h2>
      <p>
        Find the signed agreement and later changes. Note the tenancy dates,
        current rent, payment frequency and any review or renewal clause. Check
        whether the message concerns the remaining current term, a future
        renewal or a change to a separate service charge. Record the actual
        dates instead of relying on &ldquo;from next year&rdquo;.
      </p>
      <p>
        If the parties disagree about when rent may change, obtain advice on the
        agreement and applicable local law. The fact that a proposal is written
        down or that nearby asking prices have risen does not by itself resolve
        that legal question.
      </p>

      <h2>Request a complete proposal</h2>
      <p>
        A useful proposal identifies the unit, current rent, proposed rent,
        period covered, proposed effective date and response contact. Ask
        whether the deposit, service charge or other terms also change. Clarify
        whether the response date is simply a requested discussion deadline or
        part of a formal notice process that needs legal checking.
      </p>
      <p>
        For example, a message saying &ldquo;rent is now ₦1,500,000&rdquo;
        leaves out whether that means annually, when it starts and which
        agreement it changes. An itemised written proposal allows the tenant to
        ask a specific question and the landlord to correct an omission.
      </p>

      <h2>Calculate the change without treating it as a legal cap</h2>
      <p>
        In an invented example, annual rent changes from ₦1,200,000 to
        ₦1,500,000. The difference is ₦300,000, or 25% of the old rent. The
        calculation describes this proposal; it does not establish that 25% is
        permitted, typical or reasonable for another tenancy.
      </p>
      <p>
        Compare like-for-like homes using current, dated information. Match
        location, bedrooms, condition, furnishing and included services. Keep
        asking prices separate from evidence of completed lettings. A renovated
        serviced flat can be a poor comparison for an older unserviced unit on
        the same road.
      </p>

      <h2>Discuss the practical trade-offs</h2>
      <p>
        A tenant can explain the affordable amount and proposed payment
        schedule, while asking what improvements or services support the new
        figure. A landlord can compare the proposed rent with the costs and
        uncertainty of a vacant unit. Keep these as negotiation points rather
        than claims that either side must accept a particular outcome.
      </p>
      <p>
        Using the same invented annual figures, receiving ₦1,500,000 for ten
        occupied months would equal ₦1,250,000 on a simple pro-rata basis,
        before reletting costs. This is a planning illustration, not a forecast
        of vacancy or a recommended pricing decision. The actual payment
        arrangement and costs need their own calculation.
      </p>

      <h2>Record the outcome separately from the proposal</h2>
      <p>
        If new terms are agreed, record the amount, coverage dates, due dates
        and other changes in the appropriate renewal or written variation. Keep
        the previous agreement and the proposal so the sequence remains clear.
        Do not mark a proposal as accepted merely because it was sent or opened.
      </p>
      <p>
        If money arrives while terms remain disputed, ask what period and
        purpose the payer intended and obtain advice on its treatment. Read our{" "}
        <Link href="/guides/what-happens-when-rent-is-paid-early">
          early-payment guide
        </Link>{" "}
        for recordkeeping steps that separate a transfer from a concluded
        renewal.
      </p>

      <h2>Get local advice when agreement is not possible</h2>
      <p>
        Section 37 of the published Lagos Tenancy Law 2011 concerns unreasonable
        rent increases. A local lawyer should check the applicable remedy and
        procedure.
      </p>
      <p>
        Take the agreement, proposal, timeline, receipts and relevant comparable
        evidence to that discussion. Do not assume that rejecting a proposal
        automatically resolves possession, or that a pending disagreement
        removes existing payment obligations. Ask what response and next date
        are required for the actual circumstances.
      </p>
    </>
  );
}
