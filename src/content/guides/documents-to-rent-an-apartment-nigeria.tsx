import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "documents-to-rent-an-apartment-nigeria",
  coverImage: guidePhotos.paperwork,
  title: "Documents Needed to Rent in Nigeria",
  heading: "Rental documents in Nigeria: what to prepare and what to protect",
  description:
    "Prepare for a Nigerian rental with a document checklist. Learn what landlords may request, how to protect sensitive information and what to keep.",
  keywords: [
    "documents to rent apartment Nigeria",
    "what you need to rent a house Nigeria",
    "tenancy requirements Nigeria",
    "guarantor for rent Nigeria",
    "rent apartment checklist",
  ],
  datePublished: "2026-06-24",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Renting",
  author: "Property360 Editorial Team",
  articleImage: {
    src: "/images/guides/generated/article-rental-documents.webp",
    alt: "A person writing on paperwork at a desk.",
    caption:
      "Share only the documents a genuine landlord needs and keep copies of what you sign.",
  },
  scopeNote:
    "A preparation and privacy checklist. Confirm the requirements for your actual application and obtain advice before signing a guarantee.",
  standfirst:
    "Prepare your rental file in stages. Verify the recipient, agree what evidence is needed and keep a record of the copies you share.",
  tags: ["rental documents", "tenant checklist", "identity verification"],
  takeaways: [
    {
      title: "Share only what is needed",
      body: "A genuine landlord may need identification and references, but sensitive documents should be sent only through a trusted channel and never in response to pressure.",
    },
    {
      title: "Your tenancy file should travel with you",
      body: "Keep copies of the agreement, payment receipts, inventory and move-in photos where you can retrieve them without searching chat messages.",
    },
  ],
  faqs: [
    {
      question: "How should I handle a request for a guarantor?",
      answer:
        "Ask why the guarantor is needed and whether they are providing a reference or accepting an obligation. Obtain their permission before sharing details and give them the complete terms before signing.",
    },
    {
      question: "Is it safe to send my ID over WhatsApp?",
      answer:
        "Treat identity documents as sensitive. Verify the recipient first, share the minimum necessary and avoid sending them to an unverified contact or a link you do not trust.",
    },
  ],
  sources: [guideSources.personalData],
  checklist: [
    "Prepare identification and references requested by the landlord.",
    "Inspect the unit and record its condition before moving in.",
    "Read the agreement and confirm names, dates, rent, fees, and responsibilities.",
    "Keep copies of receipts, the signed agreement, and inventory photos.",
    "Share sensitive identity documents only through a trusted, secure channel.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        Ask for the landlord&apos;s application requirements before sending a
        folder of personal documents. A useful rental file changes as the
        application progresses: basic details for an enquiry, the requested
        evidence for a verified application, then the agreement and receipts for
        the tenancy itself.
      </p>

      <h2>Separate an enquiry from a formal application</h2>
      <p>
        At enquiry stage, confirm the home, viewing arrangements, full quoted
        cost and who is handling the letting. Ask which documents will be
        requested later and why. Do not assume that a request sent with an
        attractive listing means the recipient is authorised to collect your
        personal information.
      </p>
      <p>
        Once you are considering a verified home, ask for a written list of the
        application documents, the intended recipient and the submission
        channel. Different landlords and properties may have different screening
        requirements. This preparation list is not a statutory document pack
        that every Nigerian renter must submit.
      </p>

      <h2>Check identity-document requests</h2>
      <p>
        Ask which form of identification is accepted and whether a copy is
        needed or the original can be inspected without being retained. A
        passport, driver&apos;s licence or other identifier contains personal
        information, so establish who is collecting it and the purpose before
        sharing. Avoid sending extra documents simply because they are already
        in your phone gallery.
      </p>
      <p>
        The data-minimisation principle in section 24 of Nigeria&apos;s Data
        Protection Act 2023 is a useful reference: personal data collected
        should be limited to what the purpose requires. Ask how the recipient
        will protect the documents and handle an unsuccessful application.
      </p>

      <h2>Agree suitable income evidence</h2>
      <p>
        If evidence of affordability is requested, ask what information the
        landlord needs to assess. An employment letter, payslip, business record
        or other document may answer different questions. A self-employed
        applicant should explain their actual income pattern rather than
        fabricate an employment record.
      </p>
      <p>
        Ask whether irrelevant transactions or unrelated account details can be
        redacted from a statement. Keep the underlying figures accurate and
        agree an acceptable format before altering a copy. An income check does
        not require you to hand over a bank password, card PIN or one-time
        authentication code.
      </p>

      <h2>Give referees and guarantors different treatment</h2>
      <p>
        A referee provides information about an applicant; a proposed guarantor
        may be asked to accept a separate obligation. Ask what each person is
        expected to do before sharing their details. Obtain their permission and
        explain who may contact them.
      </p>
      <p>
        If someone is asked to sign a guarantee, they should receive the
        complete wording and obtain advice on its extent, duration and financial
        implications. A name in a contact field does not explain those terms. If
        you cannot provide the requested reference, explain the situation and
        ask about an alternative the landlord will accept.
      </p>

      <h2>Keep an application record</h2>
      <GuideTable
        caption="A practical document-sharing log"
        columns={["Record", "What to keep"]}
        rows={[
          [
            "Request",
            "The exact document requested, purpose and requesting organisation",
          ],
          ["Recipient", "The verified person or submission portal"],
          ["Copy sent", "The version shared and any agreed redactions"],
          [
            "Date and follow-up",
            "When it was submitted and the agreed next step",
          ],
        ]}
      />
      <p>
        For a hypothetical first-time renter, an employer reference may be
        available even though a previous-landlord reference is not. Ask the
        receiving landlord whether that alternative is acceptable before
        collecting another person&apos;s details. Presenting the situation
        honestly is more useful than submitting a misleading reference.
      </p>

      <h2>Build the move-in file separately</h2>
      <p>
        After terms are agreed, keep the signed tenancy agreement and all
        attachments, the itemised quote, receipts, payment references and
        handover record together. Add meter readings, key counts and dated
        condition photos with permission. Store a copy you can retrieve
        independently of a single chat thread.
      </p>
      <p>
        Before paying, verify the property, authority and recipient using our
        <Link href="/guides/how-to-avoid-rental-scams-nigeria">
          {" "}
          rental-safety checks
        </Link>
        . Before signing, use the
        <Link href="/guides/how-to-write-tenancy-agreement-nigeria">
          {" "}
          agreement checklist
        </Link>{" "}
        to check the names, dates, amounts and responsibilities. A complete
        application file helps organisation; it does not guarantee acceptance or
        establish that the letting itself is legitimate.
      </p>
    </>
  );
}
