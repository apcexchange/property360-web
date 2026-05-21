import type { NextConfig } from "next";

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
