import { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-14 md:pt-24 md:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="drift-slow absolute -top-24 left-[15%] h-[28rem] w-[28rem] rounded-full bg-cryola-300/35 blur-3xl" />
        <div className="drift-fast absolute -top-10 right-[5%] h-[22rem] w-[22rem] rounded-full bg-foundation-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2rem,5.5vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foundation-700">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.55] text-ink-muted">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
