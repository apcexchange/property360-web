import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { DemoTutorials } from "@/components/marketing/DemoTutorials";

export const metadata: Metadata = {
  title: "Watch a demo of Property360",
  description:
    "See Property360 in action. Short walkthroughs for landlords, agencies, and tenants: collect rent online, manage leases, and pay rent with automatic receipts.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Watch a demo of Property360",
    description: "Short product walkthroughs for landlords, agencies, and tenants.",
    url: "https://property360.africa/demo",
    type: "website",
  },
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Watch a demo"
        title={
          <>
            See Property360 in action,{" "}
            <span className="text-cryola-500">for your role.</span>
          </>
        }
        subtitle="Pick who you are and watch a short walkthrough. Landlords, agencies, and tenants each get a tour built around what they actually do."
      />
      <DemoTutorials />
      <Footer />
    </div>
  );
}
