import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TawkChat } from "@/components/TawkChat";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = "https://property360.africa";
const TITLE = "Property360 — Property management for Nigerian landlords";
const DESCRIPTION =
  "Property360 helps landlords, tenants, and agents in Nigeria manage properties, leases, rent collection, and payouts in one place. Built in Nigeria, for landlords nationwide.";

export const viewport: Viewport = {
  themeColor: "#13272C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s — Property360",
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  applicationName: "Property360",
  keywords: [
    "Nigeria property management",
    "rent collection Nigeria",
    "Paystack rent",
    "landlord app Nigeria",
    "tenancy agreement Nigeria",
    "Lagos property",
    "agent management",
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
    locale: "en_NG",
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
        addressCountry: "NG",
        addressLocality: "Lagos",
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
      className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
        <TawkChat />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
