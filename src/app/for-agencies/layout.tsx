import type { Metadata } from "next";

// The /for-agencies page is a client component, so it cannot export metadata
// itself. This server layout supplies the SEO metadata for that route.
export const metadata: Metadata = {
  title: "Property360 for agencies & property managers",
  description:
    "Run multiple landlords' portfolios from one dashboard. Property360 gives agencies and property managers granular per-property permissions, rent collection, payouts, and reporting across every client.",
  alternates: { canonical: "/for-agencies" },
  openGraph: {
    title: "Property360 for agencies & property managers",
    description:
      "Manage multiple landlord portfolios with auditable, per-property access. Rent collection, payouts, and reporting for Nigerian property agencies.",
    url: "https://property360.africa/for-agencies",
    type: "website",
  },
};

export default function ForAgenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
