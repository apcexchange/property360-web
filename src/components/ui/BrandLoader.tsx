/**
 * BrandLoader, the app's branded loading state.
 *
 * The Property360 wordmark gently breathes while a cryola segment sweeps a
 * hairline track beneath it. Replaces bare "Checking session…" / "Loading…"
 * text. Motion is disabled under prefers-reduced-motion (see globals.css);
 * the wordmark + a static bar remain so the state is still legible.
 *
 *   <BrandLoader label="Checking your session" />   // full-screen (default)
 *   <BrandLoader fullScreen={false} />               // fills its container/card
 */
export function BrandLoader({
  label = "Loading…",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "grid min-h-screen place-items-center bg-canvas"
          : "grid min-h-[180px] w-full place-items-center py-10"
      }
    >
      <div className="flex flex-col items-center">
        <div className="brand-breathe flex flex-col items-center gap-3 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-12 w-12 object-contain" />
          <div className="flex items-baseline">
            <span className="font-display text-[34px] font-medium leading-none tracking-[-0.035em] text-foundation-700">
              Property
            </span>
            <span className="font-display text-[34px] font-medium leading-none tracking-[-0.035em] text-cryola-500">
              360
            </span>
          </div>
        </div>
        <div className="relative mt-5 h-[3px] w-[140px] overflow-hidden rounded-full bg-foundation-700/10">
          <div className="brand-sweep h-full w-[40%] rounded-full bg-cryola-500" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
