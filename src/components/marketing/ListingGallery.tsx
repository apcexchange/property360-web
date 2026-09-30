"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Images, Maximize2, Share2, X } from "lucide-react";
import { ensureCoverImages } from "@/lib/propertyImage";
import { SaveListingButton } from "@/components/marketing/SaveListingButton";

interface ListingGalleryProps {
  images: string[];
  alt: string;
  unitId: string;
  captions?: Array<{ url: string; caption: string }>;
}

/**
 * One purposeful gallery for marketplace listings. It keeps focus on a single
 * photograph, while the thumbnail rail makes the rest of the listing easy to
 * explore on both touch screens and desktop.
 */
export function ListingGallery({ images, alt, unitId, captions = [] }: ListingGalleryProps) {
  const galleryImages = ensureCoverImages(images);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0];
  const activeCaption = captions.find((item) => item.url === activeImage)?.caption;
  const imageCount = galleryImages.length;

  const showPrevious = () =>
    setActiveIndex((index) => (index - 1 + imageCount) % imageCount);
  const showNext = () => setActiveIndex((index) => (index + 1) % imageCount);

  const handleTouchEnd = (endX: number) => {
    if (touchStartX.current === null || imageCount < 2) return;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    // Ignore small finger movement so vertical page scrolling remains natural.
    if (Math.abs(distance) < 40) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  const shareListing = async () => {
    const shareData = { title: alt, text: `Take a look at ${alt} on Property360`, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Closing the native share sheet is an intentional no-op.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Browsers without a supported share or clipboard API simply leave the
      // page unchanged; the URL remains available in the address bar.
    }
  };

  useEffect(() => {
    if (!isViewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsViewerOpen(false);
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isViewerOpen, imageCount]);

  return (
    <section className="mt-6" aria-label="Property photos">
      <div
        className="relative aspect-[16/11] overflow-hidden rounded-[1.5rem] bg-foundation-700/5 shadow-card sm:aspect-[16/9]"
        tabIndex={imageCount > 1 ? 0 : undefined}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") showPrevious();
          if (event.key === "ArrowRight") showNext();
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
        aria-label={imageCount > 1 ? "Property photo gallery. Swipe or use left and right arrow keys to browse." : undefined}
      >
        <Image
          key={activeImage}
          src={activeImage}
          alt={activeCaption ? `${alt}, ${activeCaption}` : `${alt}, photo ${activeIndex + 1} of ${imageCount}`}
          fill
          priority={activeIndex === 0}
          sizes="(min-width: 1024px) 1100px, 100vw"
          className="object-cover"
        />

        <div className="absolute right-4 top-4 flex gap-2 sm:right-5 sm:top-5">
          <SaveListingButton unitId={unitId} listingHref={`/listings/${unitId}`} />
          <button
            type="button"
            onClick={() => void shareListing()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foundation-900/80 px-3 text-[12px] font-semibold text-paper backdrop-blur-sm transition hover:bg-foundation-900"
            aria-label="Share this listing"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Share"}
          </button>
          <button
            type="button"
            onClick={() => setIsViewerOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foundation-900/80 px-3 text-[12px] font-semibold text-paper backdrop-blur-sm transition hover:bg-foundation-900"
            aria-label="Open full-screen photo viewer"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Photos
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-foundation-900/65 via-foundation-900/15 to-transparent px-4 pb-4 pt-16 sm:px-5 sm:pb-5">
          <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foundation-900/80 px-3 py-1.5 text-[12px] font-semibold text-paper backdrop-blur-sm">
            <Images className="h-3.5 w-3.5" />
            {activeIndex + 1} of {imageCount}
          </span>
          {activeCaption && <p className="mt-2 max-w-md truncate text-[12px] text-paper/95 drop-shadow">{activeCaption}</p>}
          </div>
          {imageCount > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous property photo"
                className="grid h-9 w-9 place-items-center rounded-full bg-paper/95 text-foundation-700 shadow-sm transition hover:bg-paper"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Next property photo"
                className="grid h-9 w-9 place-items-center rounded-full bg-paper/95 text-foundation-700 shadow-sm transition hover:bg-paper"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {imageCount > 1 && (
        <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Choose a property photo">
          {galleryImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={`relative aspect-[4/3] w-20 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition sm:w-24 ${
                index === activeIndex
                  ? "border-cryola-400"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {isViewerOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-foundation-900/95 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${activeIndex + 1} of ${imageCount}`}
          onClick={() => setIsViewerOpen(false)}
        >
          <div
            className="relative h-full w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            <Image
              src={activeImage}
              alt={`${alt}, photo ${activeIndex + 1} of ${imageCount}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setIsViewerOpen(false)}
              aria-label="Close photo viewer"
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-paper text-foundation-700 shadow-lg transition hover:bg-cryola-100"
            >
              <X className="h-5 w-5" />
            </button>
            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Previous property photo"
                  className="absolute left-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-foundation-700 shadow-lg transition hover:bg-cryola-100"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Next property photo"
                  className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-foundation-700 shadow-lg transition hover:bg-cryola-100"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <p className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-foundation-900/80 px-3 py-1.5 text-[12px] font-semibold text-paper">
              {activeIndex + 1} of {imageCount}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
