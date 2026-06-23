"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Reveal } from "./Reveal";

// 1m23s teaser / cold-open hook. Swap the ID when the full walkthrough ships.
const YOUTUBE_ID = "jRnIUjQxVlk";

export function VideoTour() {
  // Facade pattern: render YouTube's poster image and only mount the iframe
  // on click, so the landing page never pays the embed's weight on load.
  const [playing, setPlaying] = useState(false);

  return (
    <section id="watch" className="relative bg-paper py-28 md:py-36">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
            Watch the 90-second tour
          </p>
          <h2 className="mt-4 text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foundation-700">
            Your whole property business,{" "}
            <span className="draw-underline">in one place</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-[1.55] text-ink-muted">
            See how Property360 turns scattered WhatsApp threads and forgotten
            payment dates into rent that arrives on time, every time.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-foundation-700/15 bg-foundation-900 shadow-[0_40px_80px_-40px_rgb(15_39_44_/_0.55)]">
            {playing ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="Property360 — product tour"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Play the Property360 tour"
                className="group absolute inset-0 h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
                  alt="Property360 product tour"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0 bg-foundation-900/25 transition-colors group-hover:bg-foundation-900/15" />
                <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper/95 shadow-[0_18px_40px_-18px_rgb(15_39_44_/_0.6)] backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-1 h-8 w-8 fill-foundation-700 text-foundation-700" />
                </span>
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
