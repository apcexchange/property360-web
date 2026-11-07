import { ImageResponse } from "next/og";
import { getGuide } from "@/content/guides";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const themes: Record<string, { accent: string; soft: string; label: string }> = {
  Leases: { accent: "#BFFF84", soft: "#D9F3C1", label: "Leases & agreements" },
  Legal: { accent: "#F6CF83", soft: "#FBEBC9", label: "Know your rights" },
  Payments: { accent: "#A9D8D0", soft: "#DDF1ED", label: "Rent & payments" },
  Renting: { accent: "#C8C1FF", soft: "#E8E4FF", label: "Renting in Nigeria" },
  "Rent payments": { accent: "#A9D8D0", soft: "#DDF1ED", label: "Rent & payments" },
};

export default async function GuideOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const theme = themes[guide?.meta.category ?? ""] ?? themes.Renting;
  const heading = guide?.meta.heading ?? "Property360 Guides";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#13272C", color: "#F9FFF3", padding: "60px 72px", position: "relative", overflow: "hidden", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: theme.soft, opacity: 0.12, right: -150, top: -160 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 700 }}>
            <div style={{ display: "flex", width: 46, height: 46, borderRadius: "50%", alignItems: "center", justifyContent: "center", background: theme.accent, color: "#13272C" }}>P</div>
            <span>Property360</span>
            <span style={{ color: theme.accent, fontSize: 16, letterSpacing: 2.5, marginLeft: 8 }}>GUIDES</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 940 }}>
            <span style={{ color: theme.accent, fontSize: 20, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>{theme.label}</span>
            <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.04, marginTop: 20 }}>{heading}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#C7D4D1", fontSize: 21 }}>
            <span>Clear, practical property guidance for Nigeria</span>
            <span style={{ color: theme.accent, fontWeight: 700 }}>property360.africa</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
