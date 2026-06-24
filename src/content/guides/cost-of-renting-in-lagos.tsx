import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "cost-of-renting-in-lagos",
  title: "How Much Is Rent in Lagos? A 2026 Area Guide",
  heading: "How much is rent in Lagos? A 2026 area guide",
  description:
    "What it costs to rent across Lagos in 2026, from Lekki and Victoria Island to Yaba, Surulere and Ikeja, plus the move-in costs beyond rent.",
  keywords: [
    "rent in Lagos",
    "cost of rent in Lagos",
    "how much is rent in Lekki",
    "apartment prices Lagos",
    "rent Yaba Surulere Ikeja",
  ],
  datePublished: "2026-06-24",
  readingMinutes: 6,
  category: "Renting",
};

export function Body() {
  return (
    <>
      <p>
        &ldquo;How much is rent in Lagos?&rdquo; has no single answer, the city
        spans some of the most expensive neighbourhoods in West Africa and some of
        the most affordable. What you pay depends on the area, the type of unit,
        how new it is, and what&apos;s included. Here is a realistic picture for
        2026 and the costs people forget to budget for.
      </p>

      <h2>What drives the price</h2>
      <ul>
        <li>
          <strong>Location.</strong> Island areas like Ikoyi, Victoria Island and
          Lekki sit at the top; mainland areas like Yaba, Surulere and Ikeja are
          more moderate; outer areas are more affordable.
        </li>
        <li>
          <strong>Unit type.</strong> A self-contained or mini-flat costs far less
          than a 2 to 3 bedroom apartment or a serviced flat.
        </li>
        <li>
          <strong>Serviced vs unserviced.</strong> Serviced apartments bundle
          security, power and maintenance into a higher rent.
        </li>
      </ul>

      <h2>Roughly, by area</h2>
      <p>
        Treat these as broad relative bands, not quotes, real prices move with the
        specific street, building and the naira:
      </p>
      <ul>
        <li>
          <strong>Premium island (Ikoyi, Victoria Island, prime{" "}
          <Link href="/listings/in/lekki">Lekki</Link>):</strong> the highest
          rents in the city, especially for serviced apartments.
        </li>
        <li>
          <strong>Mid-market (
          <Link href="/listings/in/ajah">Ajah</Link>, parts of Lekki,{" "}
          <Link href="/listings/in/yaba">Yaba</Link>,{" "}
          <Link href="/listings/in/surulere">Surulere</Link>):</strong> a wide
          middle band that suits most working professionals.
        </li>
        <li>
          <strong>Mainland value (
          <Link href="/listings/in/ikeja">Ikeja</Link> and surrounding mainland
          areas):</strong> more space for the money, popular with families.
        </li>
      </ul>

      <h2>The costs beyond rent</h2>
      <p>
        First-year move-in is rarely just the rent. Budget for caution fee,
        security deposit, agent fee, legal and agreement fees, and sometimes a
        service charge. These can add a significant amount on top of the headline
        figure, so always ask for the full breakdown. See our guides on{" "}
        <Link href="/guides/agent-fees-in-nigeria-explained">agent fees</Link> and{" "}
        <Link href="/guides/caution-fee-vs-security-deposit-nigeria">
          caution fee vs security deposit
        </Link>
        .
      </p>

      <h2>How to find the real number for your area</h2>
      <p>
        The fastest way is to look at live listings rather than rules of thumb.
        Browse <Link href="/listings">verified homes across Lagos</Link> filtered
        by area and bedrooms to see what&apos;s actually available now, with the
        rent and move-in fees shown up front and the landlord identity-verified.
      </p>

      <p className="text-[14px] text-ink-muted">
        Prices are indicative and change constantly. Always confirm the current
        figure on a live listing before budgeting.
      </p>
    </>
  );
}
