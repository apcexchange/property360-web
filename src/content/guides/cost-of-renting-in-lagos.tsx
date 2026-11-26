import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "cost-of-renting-in-lagos",
  coverImage: guidePhotos.lagos,
  title: "Cost of Renting in Lagos: Build Your Move-in Budget",
  heading: "What does renting in Lagos really cost?",
  description:
    "Build a Lagos rental budget using current quotes, upfront fees, utilities and transport. Compare homes with a worked example and a move-in cost calculator.",
  keywords: [
    "rent in Lagos",
    "cost of rent in Lagos",
    "how much is rent in Lekki",
    "apartment prices Lagos",
    "rent Yaba Surulere Ikeja",
  ],
  datePublished: "2026-06-24",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Renting",
  author: "Property360 Editorial Team",
  stockPhoto: {
    src: "/guides/stock/cost-of-renting-in-lagos.webp",
    alt: "Tall commercial and residential buildings in a city skyline.",
    caption:
      "Compare homes by neighbourhood, size, condition and included services before setting a budget.",
    sourceUrl:
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&h=800&q=82",
    licenseUrl: "https://unsplash.com/license",
  },
  scopeNote:
    "A budgeting method for Lagos renters. All worked amounts are invented examples, not current market quotes or fee recommendations.",
  standfirst:
    "Compare the cash you need to move in and the costs you will keep paying afterwards. Use real quotes for your shortlist, with every service and fee accounted for.",
  tags: ["Lagos rent", "neighbourhoods", "move-in costs"],
  takeaways: [
    {
      title: "Compare the same kind of home",
      body: "A serviced flat, a self-contained unit and a family apartment may share a neighbourhood but not a realistic budget. Match bedrooms, condition and services.",
    },
    {
      title: "Budget the first year, not just rent",
      body: "Add quoted fees, service charge, utilities, moving and furnishing before deciding whether a home is affordable.",
    },
  ],
  faqs: [
    {
      question: "Why do two homes on the same street have different rents?",
      answer:
        "Size, finishing, reliable power, security, parking, service charge, lease length and the actual condition of the building can materially change the total cost.",
    },
    {
      question: "Are listing prices final?",
      answer:
        "A listing is an asking price. Confirm the current rent, payment period, included services and every move-in fee with an authorised representative before paying.",
    },
  ],
  sources: [guideSources.marketTrends],
  checklist: [
    "Compare similar units in the same neighbourhood and note the date checked.",
    "Confirm the rent period and whether the property is serviced.",
    "Ask for an itemised list of one-off and recurring charges.",
    "Calculate move-in costs using the actual amounts quoted to you.",
    "Confirm the exact property, landlord or agent, and payment recipient.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        To work out what renting in Lagos will cost you, make two budgets: the
        cash needed before moving in and the ongoing cost of living in that
        home. The advertised rent is an input to both budgets, but it does not
        answer either question on its own.
      </p>

      <h2>Start with current quotes for comparable homes</h2>
      <p>
        Shortlist homes with the same bedroom count and broadly similar
        condition, furnishing and services. Confirm the exact location and unit,
        when the quote was issued and how long it remains available. Labels such
        as &ldquo;Lekki&rdquo; or &ldquo;Ikeja&rdquo; can cover different
        streets, access routes and building types.
      </p>
      <p>
        You can begin with <Link href="/listings">current listings</Link>, then
        ask an authorised representative to confirm availability, the rent
        period and every additional charge. A screenshot forwarded by someone
        else may not reflect the present offer. Keep a dated quote for each
        option you are seriously considering.
      </p>

      <h2>Use neighbourhood names to plan checks</h2>
      <p>
        For a home along the Lekki–Ajah corridor, check the exact estate,
        entrance, road access and journeys you expect to make. For a Yaba or
        Surulere option, check the specific street, building condition, noise
        and shared-space arrangements. For an Ikeja option, test the route to
        work, school or other regular destinations instead of assuming the
        district name makes every journey convenient.
      </p>
      <p>
        These are viewing prompts, rather than a ranking of districts by price
        or quality. Water, power, maintenance, access and the condition of the
        actual unit matter in every area. Our
        <Link href="/guides/apartment-inspection-checklist-nigeria">
          {" "}
          apartment inspection checklist
        </Link>{" "}
        helps keep the comparison consistent.
      </p>

      <h2>Calculate the cash required before move-in</h2>
      <p>
        Add the rent payable upfront, quoted fees, deposit, service charge
        collected in advance and moving or immediate furnishing costs. Keep
        refundable amounts visible: a later refund does not reduce the money you
        need to provide today. Clarify which charges are optional, negotiated,
        recurring or still unconfirmed.
      </p>
      <p>
        Here is an invented budget to demonstrate the method. These figures are
        not Lagos market prices or recommended fees, and do not establish that
        any particular charge is permitted.
      </p>
      <GuideTable
        caption="Illustrative upfront rental budget"
        columns={["Item", "Example amount"]}
        rows={[
          ["Rent paid upfront for one year", "₦1,200,000"],
          ["Quoted agency and document services", "₦150,000"],
          ["Deposit held", "₦100,000"],
          ["Service charge paid upfront", "₦120,000"],
          ["Moving and immediate setup", "₦80,000"],
          ["Cash required in this example", "₦1,650,000"],
        ]}
      />
      <p>
        Enter your own quoted amounts in the
        <Link href="/guides/tools/move-in-cost-calculator">
          {" "}
          move-in cost calculator
        </Link>
        . Ask for a breakdown where a line combines several services, and update
        the budget when a quote changes.
      </p>

      <h2>Build a separate ongoing budget</h2>
      <p>
        List electricity, water, backup power, internet, transport and other
        recurring costs using information for the actual home. Ask which are
        metered, shared or included in a service charge. Avoid counting an
        included service twice. Confirm how changes to shared costs are
        communicated and what a recent statement covers.
      </p>
      <p>
        Dividing an annual amount by twelve can help compare monthly
        affordability, but it does not change an upfront payment deadline. A
        home that fits a monthly budget may still require more cash at move-in
        than you have available. Plan for both constraints.
      </p>

      <h2>Include the cost of your routine</h2>
      <p>
        Test your likely journey at relevant times, where practical, and
        consider an alternative route. Note fares or fuel, parking and how
        frequently you make the trip. A hypothetical extra ₦2,000 of travel per
        workday is ₦44,000 across 22 workdays; replace those figures with your
        own route and schedule before comparing two homes.
      </p>
      <p>
        Also consider access to groceries, schools, healthcare and the people
        you depend on. A rent saving can be less useful if routine journeys
        become more costly or difficult. That is a household decision, not
        something an area-wide average can settle.
      </p>

      <h2>Read market reports with their methodology</h2>
      <p>
        A report can provide context, but check its observation period,
        geographic coverage and property mix. Establish whether it reports
        asking rents, completed transactions or a modelled index. Use a
        published period that has actually finished if you need a historical
        comparison, and keep the source date with any figure you record.
      </p>
      <p>
        This guide does not publish a current neighbourhood price table. Decide
        using dated, like-for-like offers, an inspection and a written total.
        Before transferring, complete the identity and payment checks in our{" "}
        <Link href="/guides/how-to-avoid-rental-scams-nigeria">
          rental-safety guide
        </Link>
        .
      </p>
    </>
  );
}
