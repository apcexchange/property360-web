"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { DEMO_ROLES } from "@/content/demoVideos";

/**
 * Lightweight YouTube facade: shows the thumbnail with a play button and only
 * loads the (heavy) YouTube iframe once the user clicks. Keeps the page fast
 * and uses the privacy-friendlier youtube-nocookie host.
 */
function YouTubeFacade({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-foundation-700/10 bg-foundation-700/5">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span className="absolute inset-0 grid place-items-center bg-foundation-700/20 transition group-hover:bg-foundation-700/30">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-foundation-700 shadow-lg transition group-hover:scale-105">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export function DemoTutorials() {
  const [active, setActive] = useState(DEMO_ROLES[0].key);

  // Deep-link support: /demo#tenants opens the Tenants tab.
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (DEMO_ROLES.some((r) => r.key === fromHash)) setActive(fromHash);
  }, []);

  function selectRole(key: string) {
    setActive(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  const role = DEMO_ROLES.find((r) => r.key === active) ?? DEMO_ROLES[0];

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose your role">
        {DEMO_ROLES.map((r) => {
          const on = r.key === active;
          return (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => selectRole(r.key)}
              className={`rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${
                on
                  ? "bg-foundation-700 text-paper"
                  : "border border-foundation-700/15 bg-paper text-foundation-700 hover:border-foundation-700/30"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-ink-muted">{role.blurb}</p>

      <div
        className={`mt-8 grid gap-8 ${
          role.videos.length > 1 ? "md:grid-cols-2" : "max-w-3xl"
        }`}
      >
        {role.videos.map((v) => (
          <div key={`${role.key}-${v.title}`}>
            <YouTubeFacade id={v.id} title={v.title} />
            <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-foundation-700">
              {v.title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-muted">{v.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
