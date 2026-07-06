import type { NextConfig } from "next";

// Enforced security headers applied to every route. Kept conservative so they
// can't break the live app: no Permissions-Policy (the KYC flow may use the
// camera) and HSTS without includeSubDomains/preload (those are sticky and
// one-way). Clickjacking is covered by X-Frame-Options.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// Content-Security-Policy shipped in Report-Only mode first: it never blocks,
// it only reports what an enforcing policy WOULD block. Review violations in the
// browser console, then promote the header name to `Content-Security-Policy`.
// Sources reflect the current third parties: Vercel Analytics, Smartsupp chat,
// PostHog (EU), Cloudinary images, the backend API, and YouTube (demo page).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://www.smartsuppchat.com https://*.smartsupp.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://api.property360.africa https://*.posthog.com https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.property360.africa https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.smartsupp.com wss://*.smartsupp.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://*.smartsupp.com https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary — where backend stores property images
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Backend's own /uploads/ static (dev fallback)
      { protocol: "https", hostname: "api.property360.africa" },
    ],
  },
  async headers() {
    return [
      // Security headers on every route (well-known app-link files below keep
      // their own specific headers; these are additive, not conflicting).
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      // Universal links — both files must be served as application/json over HTTPS.
      // apple-app-site-association has no file extension; Next would otherwise
      // serve it as octet-stream and iOS would reject it.
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
