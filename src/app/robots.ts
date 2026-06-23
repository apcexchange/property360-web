import type { MetadataRoute } from "next";

const SITE_URL = "https://property360.africa";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Keep public marketing + listing pages indexable, but keep the admin
        // surface and all authenticated/account-only routes out of the index.
        allow: "/",
        disallow: [
          "/admin",
          "/app",
          "/me",
          "/login",
          "/billing/login",
          "/invite",
          "/invitations",
          "/onboarding/account",
          "/onboarding/verify",
          "/onboarding/plan",
          "/onboarding/done",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
