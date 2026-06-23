import { ImageResponse } from "next/og";

// Default social-share card used across every route that doesn't define its
// own opengraph-image. Next.js wires this up as both the Open Graph and
// Twitter image automatically, so a single file fixes share previews
// site-wide (WhatsApp, X/Twitter, LinkedIn, Facebook).
export const alt =
  "Property360 — Property management for Nigerian landlords, tenants, and agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#13272C",
          color: "#F5F3EC",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#E8B864",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#13272C",
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ fontSize: "34px", fontWeight: 700 }}>Property360</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <span
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "920px",
            }}
          >
            Property management built for Nigeria
          </span>
          <span style={{ fontSize: "32px", color: "#B8C4C2", maxWidth: "900px" }}>
            Collect rent online, automate invoices and receipts, manage leases,
            and fill vacant units. All in one place.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "28px",
            color: "#B8C4C2",
          }}
        >
          <span>For landlords, tenants & agents</span>
          <span style={{ color: "#E8B864", fontWeight: 700 }}>
            property360.africa
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
