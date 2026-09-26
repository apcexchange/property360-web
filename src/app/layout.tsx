import type { Metadata, Viewport } from "next";
import { AppAnalytics } from "@/components/AppAnalytics";
import { SalesChatWidget } from "@/components/sales/SalesChatWidget";
import { ChunkErrorReloader } from "@/components/ChunkErrorReloader";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ConsentNotice } from "@/components/ConsentNotice";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const SITE_URL = "https://property360.africa";
const TITLE = "Property360, a global property marketplace and management app";
const DESCRIPTION =
  "List homes, land, shops, shortlets and hotel rooms free. Find a place, book a stay, collect rent, manage leases and handle property life in one app.";

export const viewport: Viewport = {
  themeColor: "#13272C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s, Property360",
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  // Note: no global canonical here on purpose. A root-level `canonical: "/"`
  // is inherited by any page that doesn't set its own, which wrongly tells
  // Google those pages are duplicates of the homepage. Each public page sets
  // its own canonical instead.
  applicationName: "Property360",
  keywords: [
    "property management",
    "rent collection",
    "landlord app",
    "tenancy agreements",
    "property marketplace",
    "agent management",
    "free property listing",
    "shortlet booking",
    "hotel rooms",
  ],
  authors: [{ name: "Property360", url: SITE_URL }],
  creator: "Property360",
  publisher: "Property360",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Property360",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "Property360",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "GM Mall, KM 46 Lekki-Epe Expressway, opposite SBI Hotel, Sangotedo",
        addressLocality: "Lagos",
        addressRegion: "Lagos",
        addressCountry: "NG",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "hello@property360.africa",
          contactType: "customer support",
          areaServed: "NG",
          availableLanguage: ["English"],
        },
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Property360",
      operatingSystem: "iOS, Android",
      applicationCategory: "BusinessApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
      description: DESCRIPTION,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}#organization` },
    },
    {
      "@type": "WebSite",
      url: SITE_URL,
      name: "Property360",
      publisher: { "@id": `${SITE_URL}#organization` },
      inLanguage: "en-NG",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className=""
    >
      <body className="font-sans">
        <ChunkErrorReloader />
        <PostHogProvider>
          <ToastProvider>{children}</ToastProvider>
        </PostHogProvider>
        <ConsentNotice />
        <AppAnalytics />
        <SalesChatWidget />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
