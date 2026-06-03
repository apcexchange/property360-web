import { Marquee } from "./Marquee";

const claims = [
  "Auto-invoicing",
  "Paystack rent collection",
  "Wallet & instant payouts",
  "Tenancy agreements signed in-app",
  "KYC for every account",
  "In-app chat",
  "Maintenance with photos",
  "Multi-property, multi-agent",
  "Built in Nigeria",
];

export function TrustStrip() {
  return (
    <section
      aria-label="Capabilities"
      className="relative overflow-hidden border-y border-foundation-600/40 bg-foundation-700 py-5 text-paper"
    >
      <Marquee durationSeconds={48}>
        {claims.map((c) => (
          <div
            key={c}
            className="flex items-center gap-12 whitespace-nowrap text-[15px] font-medium tracking-tight text-paper"
          >
            <span>{c}</span>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cryola-400" />
          </div>
        ))}
      </Marquee>
    </section>
  );
}
