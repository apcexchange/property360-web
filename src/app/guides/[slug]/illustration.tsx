import { ImageResponse } from "next/og";
import { getGuide } from "@/content/guides";

export const size = { width: 1200, height: 675 };
export const contentType = "image/png";

const themes: Record<string, { accent: string; subtle: string; motif: string }> = {
  Leases: { accent: "#BFFF84", subtle: "#DDF9C2", motif: "Agreement checklist" },
  Legal: { accent: "#F6CF83", subtle: "#FBEBC9", motif: "Process before pressure" },
  Payments: { accent: "#A9D8D0", subtle: "#DDF1ED", motif: "A clear payment trail" },
  Renting: { accent: "#C8C1FF", subtle: "#E8E4FF", motif: "A safer renting decision" },
  "Rent payments": { accent: "#A9D8D0", subtle: "#DDF1ED", motif: "A clear payment trail" },
};

export default async function GuideIllustrationImage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { slug } = await params;
  const { variant: rawVariant } = await searchParams;
  const guide = getGuide(slug);
  const variant = Math.min(Math.max(Number(rawVariant) || 1, 1), 3);
  const theme = themes[guide?.meta.category ?? ""] ?? themes.Renting;
  const title = guide?.meta.heading ?? "Property360 Guide";
  const items = variant === 1
    ? guide?.meta.checklist.slice(0, 3) ?? []
    : variant === 2
      ? guide?.meta.takeaways?.map((takeaway) => takeaway.title).slice(0, 3) ?? []
      : guide?.meta.faqs?.map((faq) => faq.question).slice(0, 3) ?? [];
  const label = variant === 1 ? theme.motif : variant === 2 ? "What to check before acting" : "Questions worth asking";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F9FFF3", color: "#13272C", padding: "56px", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", display: "flex", background: "#13272C", borderRadius: 34, padding: "54px", color: "#F9FFF3", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 390, height: 390, borderRadius: "50%", background: theme.accent, opacity: 0.16, right: -92, bottom: -140 }} />
          <div style={{ display: "flex", width: "100%", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", color: theme.accent, fontSize: 18, letterSpacing: 1.6, fontWeight: 700, textTransform: "uppercase" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: theme.accent }} />
              {label}
            </div>
            <div style={{ display: "flex", gap: 40, alignItems: "end" }}>
              <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
                <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>{title}</span>
                <span style={{ color: "#C7D4D1", marginTop: 20, fontSize: 21, lineHeight: 1.35 }}>Property360 Guides · practical steps for property decisions in Nigeria</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 380, background: "#F9FFF3", borderRadius: 24, padding: 28, color: "#13272C" }}>
                {items.map((item, index) => (
                  <div key={item} style={{ display: "flex", gap: 13, fontSize: 17, lineHeight: 1.25 }}>
                    <span style={{ display: "flex", flexShrink: 0, width: 25, height: 25, borderRadius: "50%", background: theme.subtle, alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
