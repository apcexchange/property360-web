import Link from "next/link";
import { guidePhotos } from "./photos";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "how-to-report-rental-maintenance",
  title: "How to Report Rental Maintenance and Track Repairs",
  heading: "From a leaking tap to a clear repair plan",
  description:
    "A practical guide for tenants and landlords: describe a maintenance issue, record photos, agree access and track a repair through to completion.",
  coverImage: guidePhotos.maintenance,
  keywords: [
    "report rental maintenance",
    "tenant repair request",
    "landlord maintenance checklist",
    "track property repairs Nigeria",
  ],
  datePublished: "2026-11-26",
  readingMinutes: 5,
  category: "Maintenance",
  author: "Property360 Editorial Team",
  standfirst:
    "A useful repair request tells everyone what happened, where it happened and what needs to happen next. Here is how to keep the whole process clear.",
  scopeNote:
    "A reporting and follow-up workflow. Responsibility for repairs and access arrangements depends on the agreement, circumstances and applicable local rules.",
  tags: ["repairs", "property care", "landlords", "tenants"],
  takeaways: [
    {
      title: "Describe the problem, not a diagnosis",
      body: "Report what you can observe, where it is and when it started. Let the appropriate professional decide the cause and repair.",
    },
    {
      title: "Keep one record through to completion",
      body: "Save the request, acknowledgement, appointment, agreed costs and completion notes together so neither party has to reconstruct the conversation.",
    },
  ],
  faqs: [
    {
      question: "Who pays for a repair in a rented home?",
      answer:
        "Responsibility depends on the agreement, the cause of the problem and the rules that apply to the property. Record the issue, ask for written confirmation of responsibility and agree any cost before commissioning work. Get local professional advice if there is a dispute.",
    },
    {
      question: "What if I already reported the fault by phone?",
      answer:
        "Follow up through the agreed written channel with the date of the call, a short description and any reference number. Ask the recipient to confirm the next step so the call and the repair record stay connected.",
    },
    {
      question: "When should a repair request be closed?",
      answer:
        "After the work has been checked and the outcome recorded. If the original problem remains or returns, document what happened and ask for the request to be reopened or linked to a follow-up visit.",
    },
  ],
  checklist: [
    "Record the property, unit and exact location of the problem.",
    "Describe what happened, when it started and how it affects the home.",
    "Attach dated photos or a short video taken from a safe position.",
    "Send the request through the agreed maintenance channel.",
    "Confirm the next update, access arrangements and any agreed costs.",
    "Check the completed work and save the outcome with the original request.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        &ldquo;The plumbing is bad&rdquo; is difficult to act on. &ldquo;Water
        is dripping from the pipe under the kitchen sink in Flat 3, first
        noticed on Monday evening&rdquo; gives a landlord or manager a useful
        starting point. A clear record helps tenants explain a problem and helps
        property owners arrange the right next step.
      </p>

      <h2>Deal with immediate danger first</h2>
      <p>
        If the situation presents an immediate danger, move to a safe place and
        contact the appropriate emergency service or the building&apos;s urgent
        contact. Do not wait for a routine maintenance message to be read. Avoid
        exposed wiring, unstable structures and other hazards, and leave
        technical work to a qualified professional.
      </p>
      <p>
        Once it is safe to do so, make a written record of what happened and
        whom you contacted. A routine repair request is useful for tracking
        follow-up work, but it should not delay an urgent response.
      </p>

      <h2>Write down what someone else needs to know</h2>
      <p>
        Include your property address or reference, unit number and the exact
        location of the problem. Describe what you can observe: a drip, a door
        that will not lock, an appliance that stops during use or a damp patch
        that has spread. Add when you first noticed it, whether it is constant
        or intermittent, and how it affects everyday use of the home.
      </p>
      <p>
        Mention an earlier repair or request if it concerns the same problem.
        Separate observations from guesses about the cause. You do not need to
        identify a faulty component before asking for help, and an unconfirmed
        diagnosis can send a contractor in the wrong direction.
      </p>

      <h2>Add photos that explain the location</h2>
      <p>
        When safe, take a wider photo showing where the problem is and a close
        photo showing the visible fault. A short video can help explain an
        intermittent leak or unusual sound. Keep the original dated files and
        avoid including identity documents, other residents or unrelated
        personal belongings in the frame.
      </p>
      <p>
        Photos support a report; they do not replace an inspection. If a fault
        is inside a wall or electrical fitting, describe the symptoms instead of
        dismantling it for a clearer picture.
      </p>

      <h2>Use one agreed channel and ask for the next step</h2>
      <p>
        Send the report to the landlord, manager or maintenance contact named in
        your agreement or handover information. If you have already called,
        follow up in writing. Keep a copy of the message and any request number.
        Ask who will handle the issue and when you should expect the next
        update.
      </p>
      <p>
        There is no single response time to assume for every property and fault.
        Record the timetable actually agreed. If an update is missed, follow up
        with the original reference and explain whether the issue has changed,
        rather than starting an unrelated conversation.
      </p>

      <h2>A repair request you can adapt</h2>
      <blockquote>
        Flat 3, kitchen: I noticed water dripping from the visible pipe under
        the sink on Monday evening. It happens when the tap is running and the
        cupboard floor is wet. I have attached a wider photo and a close-up.
        Please confirm who will inspect it and the next update date. I am
        available Tuesday afternoon or Wednesday morning; please agree a time
        with me before the visit.
      </blockquote>
      <p>
        Replace the details with your own observations. Keep access details in
        the private maintenance conversation; do not publish keys, entry codes
        or a resident&apos;s schedule in a public group.
      </p>

      <h2>Agree access and costs before the visit</h2>
      <p>
        Confirm the date, arrival window, contractor&apos;s identity and how
        access will be arranged. Ask whom to contact if the contractor is late
        or needs a second visit. Landlords and managers should explain the
        proposed work clearly and agree access with the resident.
      </p>
      <p>
        Before arranging paid work, confirm who is authorising it and who is
        responsible for the charge. Responsibility can depend on the agreement,
        the cause and applicable local rules. Keep quotes, approvals and
        receipts together. For an unresolved dispute, get advice from someone
        qualified to assess the agreement and the property&apos;s location.
      </p>

      <h2>Check the result and close the loop</h2>
      <p>
        After the work, check the original symptom with the contractor where
        appropriate. Record what was done, the completion date and any follow-up
        instructions. If a replacement part or return visit is still needed,
        record the request as awaiting follow-up rather than complete.
      </p>
      <p>
        Keep a simple status history: reported, acknowledged, visit agreed,
        awaiting parts or access, and completed after checking. If a visit
        happens but the fault remains, record what was attempted and the next
        update date. A contractor attending the property is a useful event to
        record, but it does not by itself show that the original problem was
        resolved.
      </p>
      <p>
        If the problem returns, add new evidence and refer to the earlier
        repair. A shared history helps everyone see the pattern. For a new
        tenancy, start that history with the condition record in our{" "}
        <Link href="/guides/apartment-inspection-checklist-nigeria">
          apartment inspection checklist
        </Link>
        .
      </p>
    </>
  );
}
