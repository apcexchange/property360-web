import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Property360 — Property management for Nigerian landlords",
    template: "%s — Property360",
  },
  description:
    "Property360 helps landlords, tenants, and agents in Nigeria manage properties, leases, rent collection, and payouts in one place.",
  metadataBase: new URL("https://property360.africa"),
  openGraph: {
    title: "Property360",
    description:
      "Manage properties, leases, and rent collection in Nigeria — built for landlords, tenants, and agents.",
    url: "https://property360.africa",
    siteName: "Property360",
    locale: "en_NG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
