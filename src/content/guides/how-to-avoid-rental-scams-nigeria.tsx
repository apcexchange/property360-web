import { guideSources } from "./sources";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "how-to-avoid-rental-scams-nigeria",
  coverImage: guidePhotos.keys,
  title: "Avoid Rental Scams in Nigeria: Safety Checklist",
  heading: "How to avoid rental scams in Nigeria",
  description:
    "Learn how to spot rental scams in Nigeria: inspect the home, verify the landlord or agent, confirm fees and payments, and protect your documents.",
  keywords: [
    "rental scams Nigeria",
    "avoid house rent scam",
    "fake landlord Nigeria",
    "how to verify a landlord",
    "safe house hunting Lagos",
  ],
  datePublished: "2026-06-24",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Renting",
  author: "Property360 Editorial Team",
  articleImage: {
    src: "/images/guides/generated/article-rental-safety.webp",
    alt: "A bright bedroom with a neatly made bed and large windows.",
    caption:
      "Inspect the actual property and verify the listing, agent authority and recipient before sending money.",
  },
  scopeNote:
    "Risk-reduction checks for a rental search. No platform badge, inspection or payment method guarantees a transaction or the recovery of money.",
  standfirst:
    "Slow down before money moves. Inspect the actual home, establish who can let it, pay traceably, and keep a written record of every commitment.",
  tags: ["rental scam", "safe renting", "property verification"],
  takeaways: [
    {
      title: "Urgency is not verification",
      body: "A claim that another renter is ready to pay is not evidence that the home is available or that the person requesting money can let it.",
    },
    {
      title: "Keep a traceable trail",
      body: "Use a payment method and receipt that identify the recipient, amount, date and purpose; save the listing, messages and inspection record too.",
    },
  ],
  faqs: [
    {
      question: "Should I pay an inspection fee before I see a home?",
      answer:
        "Do not let a request for any fee replace verification. Confirm the property, the agent's authority and the written terms before making a payment.",
    },
    {
      question: "What should I do if I think I was scammed?",
      answer:
        "Act quickly: keep all messages and payment evidence, contact your bank or payment provider, and report suspected crime to the appropriate law-enforcement authority.",
    },
  ],
  sources: [guideSources.bankSafety, guideSources.bankComplaints],
  checklist: [
    "Inspect the exact property before paying a deposit or rent.",
    "Verify the identity of the owner or the agent's authority to act.",
    "Get the full fee breakdown and the recipient's details in writing.",
    "Pay through a traceable channel and verify the payment independently.",
    "Keep the signed agreement, receipt, and all transaction references.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        Check three things separately before committing money to a rental: the
        exact home, the authority of the person arranging it and the payment
        instructions. A convincing photo or identity document may answer one
        question while leaving the other two unresolved.
      </p>

      <h2>Inspect the home you are actually being offered</h2>
      <p>
        Confirm the street, building and unit number, and compare the viewed
        home with the advertisement. Ask why any features differ and whether you
        are seeing the available unit or a similar one. Record the date and the
        person who showed it. Our
        <Link href="/guides/apartment-inspection-checklist-nigeria">
          {" "}
          viewing checklist
        </Link>{" "}
        covers the condition and service questions to ask at the same visit.
      </p>
      <p>
        If you cannot attend, consider an independent person you trust to
        inspect it. A live video tour can help explain a layout, but does not
        establish the representative&apos;s authority or the unit&apos;s
        availability. Ask what remains unverified before deciding whether to
        proceed.
      </p>

      <h2>Confirm the representative through another route</h2>
      <p>
        Ask who owns or manages the property and what authority the agent has to
        advertise, negotiate, sign or receive money. Different permissions may
        be held by different people. Where ownership or authority is unclear,
        obtain an appropriate independent document or legal check.
      </p>
      <p>
        Use a contact route you established independently, such as an agency
        office number you found yourself. Calling only the number supplied in a
        message asking for payment does not add an independent check. Company
        names, badges and identity documents can support enquiries, but they do
        not guarantee a particular transaction.
      </p>

      <h2>Make the complete offer checkable</h2>
      <p>
        Request the rent period, every fee, deposit terms, intended handover
        date and the draft agreement before a large payment. Confirm which
        person receives each amount and what receipt will be issued. Resolve
        mismatched names, changed amounts and unexplained conditions before
        transferring.
      </p>
      <p>
        An unusually low asking rent or an urgent deadline is a reason to ask
        questions, not proof of a crime. The useful question is whether the
        other party will let you verify the offer. Pressure to skip inspection
        or pay an unexplained recipient leaves a concrete problem unresolved.
      </p>

      <h2>Handle last-minute changes carefully</h2>
      <p>
        Consider this invented scenario: you inspected Flat 4 and received
        written instructions to pay a named agency. A new message says its
        account has a problem and asks you to transfer to a different person
        immediately. Pause the transfer and confirm the change through your
        independently verified contact. Save both instructions and the reply.
      </p>
      <p>
        This is a verification exercise, not evidence that every alternative
        account is fraudulent. What matters is establishing a consistent
        explanation, authority and written instruction before money moves. Do
        not let the time already spent viewing the home replace that check.
      </p>

      <h2>Protect your accounts as well as your rent</h2>
      <p>
        Avoid sharing passwords, PINs or one-time codes with someone claiming to
        handle a rental application. Check a payment or sign-in address before
        entering details, and use the provider&apos;s official channel if a link
        seems unusual. Do not install a remote-access tool to let a stranger
        &ldquo;help&rdquo; with a transfer.
      </p>
      <p>
        The CBN&apos;s consumer-education guidance advises prompt reporting of
        suspected fraud or account compromise to the bank and relevant
        authorities. Keep your bank&apos;s official contact details available
        rather than relying on a number supplied by the person requesting money.
      </p>

      <h2>If money has already been sent</h2>
      <p>
        Contact your bank or payment provider promptly with the amount, date,
        transaction reference, recipient and reason for concern. Ask what action
        is available and obtain a complaint reference. Preserve the listing,
        original messages, payment evidence and any documents. Report suspected
        crime through the appropriate law-enforcement channel.
      </p>
      <p>
        Recovery is not guaranteed. Be cautious if someone now requests an
        advance fee or your account credentials to &ldquo;recover&rdquo; the
        money. The CBN complaints guidance concerns a financial
        institution&apos;s handling of a complaint; it does not decide ownership
        or a tenancy dispute. Keep those issues separate when seeking help.
      </p>
    </>
  );
}
