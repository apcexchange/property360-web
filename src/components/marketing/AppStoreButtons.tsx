"use client";

import Link from "next/link";

const IOS_URL = "https://apps.apple.com/app/property360/id0000000000";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.property360.africa";

export function AppStoreButtons({
  className = "",
  align = "left",
}: {
  className?: string;
  align?: "left" | "center";
}) {
  const justify = align === "center" ? "justify-center" : "justify-start";
  return (
    <div className={`flex flex-wrap items-center gap-3 ${justify} ${className}`}>
      <Link
        href={IOS_URL}
        className="group inline-flex items-center gap-2 rounded-2xl bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        <AppleGlyph />
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[10px] font-normal opacity-80">Download on</span>
          <span>App Store</span>
        </span>
      </Link>
      <Link
        href={ANDROID_URL}
        className="group inline-flex items-center gap-2 rounded-2xl bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        <PlayGlyph />
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[10px] font-normal opacity-80">Get it on</span>
          <span>Google Play</span>
        </span>
      </Link>
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M16.365 1.43c0 1.14-.46 2.27-1.21 3.08-.8.86-2.11 1.53-3.16 1.45-.13-1.14.43-2.32 1.18-3.1.85-.9 2.27-1.57 3.19-1.43zM20.5 17.1c-.61 1.41-.9 2.04-1.69 3.29-1.1 1.74-2.64 3.91-4.55 3.93-1.7 0-2.13-1.11-4.43-1.1-2.3.01-2.77 1.13-4.47 1.1C3.45 24.3 2 22.34.9 20.6c-3.07-4.84-3.39-10.53-1.5-13.55C.7 4.93 2.96 3.6 5.08 3.57c1.74-.03 3.39 1.17 4.46 1.17 1.07 0 3.08-1.45 5.18-1.24.88.04 3.34.36 4.92 2.7-.13.08-2.95 1.72-2.92 5.13.04 4.07 3.58 5.42 3.62 5.44-.03.09-.57 1.94-1.84 4.33z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M3.6 1.7c-.3.2-.4.6-.4 1v18.6c0 .4.1.8.4 1l10.7-10.3L3.6 1.7zm12.3 11.7l3 2.9c1-.6 1-1.7 0-2.3l-3-2.9-1.8 1.7 1.8 1.6zm-2.3-2.3L3 21.6c.2 0 .4-.1.6-.2l11.2-6.4-1.8-1.9zm0-2L14.8 7l-11.2-6.4c-.2-.1-.4-.2-.6-.2l10.6 9.7z" />
    </svg>
  );
}
