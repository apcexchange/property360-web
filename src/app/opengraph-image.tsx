import { ImageResponse } from "next/og";

// Default social-share card used across every route that doesn't define its
// own opengraph-image. Next.js wires this up as both the Open Graph and
// Twitter image automatically, so a single file fixes share previews
// site-wide (WhatsApp, X/Twitter, LinkedIn, Facebook).
export const alt =
  "Property360, list, find and manage property everywhere";
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
          backgroundColor: "#102A2E",
          color: "#F5F3EC",
          padding: "62px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              backgroundColor: "#B8FA70",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#102A2E",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ fontSize: "31px", fontWeight: 700 }}>Property360</span>
          <span
            style={{
              marginLeft: "16px",
              borderLeft: "1px solid #557075",
              paddingLeft: "16px",
              color: "#B8C4C2",
              fontSize: "18px",
              letterSpacing: "2px",
            }}
          >
            PROPERTY, EVERYWHERE
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ width: "70px", height: "5px", backgroundColor: "#B8FA70" }} />
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "980px",
            }}
          >
            Find it. List it. Manage it.
          </span>
          <span style={{ fontSize: "27px", lineHeight: 1.35, color: "#C9D4D1", maxWidth: "950px" }}>
            Homes, land, shops, shortlets and hotel rooms — plus rent, leases
            and maintenance in one place.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            color: "#B8C4C2",
          }}
        >
          <span>Free to list · Built for everywhere</span>
          <span style={{ color: "#B8FA70", fontWeight: 700 }}>
            property360.africa
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
