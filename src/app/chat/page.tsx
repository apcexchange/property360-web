import type { Metadata } from "next";
import { SalesChatPage } from "@/components/sales/SalesChatPage";

export const metadata: Metadata = {
  title: "Chat with Property360",
  description:
    "Ask the Property360 assistant anything about collecting rent, managing tenants and running your properties. Real answers in seconds, a real person if you need one.",
  alternates: { canonical: "/chat" },
  openGraph: {
    title: "Chat with Property360",
    description:
      "Ask our assistant anything about Property360, then start free. Rent collection, tenants, leases and payouts in one place.",
    url: "https://property360.africa/chat",
    type: "website",
  },
};

export default function ChatRoute() {
  return <SalesChatPage />;
}
