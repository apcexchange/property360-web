import type { GuideMeta } from "./types";

type GuideSource = NonNullable<GuideMeta["sources"]>[number];

// References inspected during the November 2026 content revision. A source's
// publication date is not a guarantee that it is the latest applicable law.
export const guideSources = {
  tenancyLaw: {
    publisher: "Lagos State Ministry of Justice",
    label: "Tenancy Law 2011 (published text)",
    url: "https://lagosstatemoj.org/wp-content/uploads/2020/12/Tenancy-Law-2011.pdf",
    note: "Lagos reference. Check applicability and subsequent changes locally.",
  },
  paymentVerification: {
    publisher: "Paystack",
    label: "Verify Payments",
    url: "https://paystack.com/docs/payments/verify-payments/",
    note: "Explains transaction confirmation and payment statuses, including pending and reversed payments.",
  },
  bankSafety: {
    publisher: "Central Bank of Nigeria",
    label: "Bank Customers' Bill of Rights and Duties",
    url: "https://www.cbn.gov.ng/supervision/cpdconedu.html",
    note: "Banking safety and reporting suspected fraud or account compromise.",
  },
  bankComplaints: {
    publisher: "Central Bank of Nigeria",
    label: "Complaints Management",
    url: "https://www.cbn.gov.ng/supervision/cpdcomgt.html",
    note: "Complaints about regulated financial institutions, rather than tenancy disputes.",
  },
  personalData: {
    publisher: "Nigeria Data Protection Commission",
    label: "Nigeria Data Protection Act 2023",
    url: "https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf",
    note: "Section 24 sets out principles for handling personal data, including data minimisation.",
  },
  marketTrends: {
    publisher: "Nigeria Property Centre",
    label: "Property-market data and methodology",
    url: "https://nigeriapropertycentre.com/market-trends",
    note: "A property portal's market reference. Check each series' dates and methodology before using a figure as a comparison.",
  },
} satisfies Record<string, GuideSource>;
