"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  ImagePlus,
  Film,
  Loader2,
  X,
  Play,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Star,
  LockKeyhole,
} from "lucide-react";
import { Card } from "./ui";
import { landlordApi, Property } from "@/lib/landlord-api";
import { DEFAULT_PROPERTY_IMAGE } from "@/lib/propertyImage";
import { useToast } from "@/components/ui/Toast";
import { billingApi, hasPaidVideoUploadAccess } from "@/lib/billing-api";
import {
  SUBSCRIPTION_LIMIT_EVENT,
  SubscriptionLimitDetail,
} from "@/lib/api";

// Property media (images + videos) are stored on the backend as flat arrays
// of Cloudinary secure_url strings, see backend Property model. Coerce
// defensively: legacy rows / failed uploads can leave null or "" entries,
// and a stray non-string would crash the gallery.
function cleanUrls(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((u): u is string => typeof u === "string" && u.length > 0);
}

type Lightbox = { type: "image" | "video"; url: string } | null;

/**
 * Editable photo + video gallery for an existing property. Landlords can:
 *  - add multiple photos and videos at once (multi-select),
 *  - see them appear immediately (the query cache is patched optimistically
 *    before the server round-trip, so there's no "uploaded but blank" gap),
 *  - preview a video by hovering (it plays muted in place) and open any item
 *    full-size in a lightbox,
 *  - remove anything.
 *
 * Every change persists the full desired array via PUT /properties/:id,  * the backend replaces the stored array wholesale, so we always send the
 * complete next state.
 */
export function PropertyMediaCard({
  property,
  propertyId,
}: {
  property: Property;
  propertyId: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const subscription = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => billingApi.getSubscription(),
    staleTime: 60_000,
  });

  const images = cleanUrls(property.images);
  const videos = cleanUrls(property.videos);
  const hasMedia = images.length > 0 || videos.length > 0;
  // Do not lock while the subscription request is still resolving — a paid
  // user should never see an incorrect upgrade prompt because of a slow
  // connection. The API repeats the enforcement as the final safeguard.
  const videoUploadLocked = Boolean(
    subscription.data && !hasPaidVideoUploadAccess(subscription.data)
  );

  function showVideoUpgrade() {
    const detail: SubscriptionLimitDetail = {
      reason: "VIDEO_UPLOAD_NOT_IN_PLAN",
    };
    window.dispatchEvent(
      new CustomEvent(SUBSCRIPTION_LIMIT_EVENT, { detail })
    );
  }

  // Patch the cached property so new media renders the instant an upload
  // resolves, before the PUT + refetch completes.
  function patchCache(next: { images?: string[]; videos?: string[]; imageCaptions?: Array<{ url: string; caption: string }> }) {
    queryClient.setQueryData(
      ["properties", propertyId],
      (old: { property?: Property; units?: unknown[] } | undefined) =>
        old?.property
          ? { ...old, property: { ...old.property, ...next } }
          : old
    );
  }

  async function persist(next: { images?: string[]; videos?: string[]; imageCaptions?: Array<{ url: string; caption: string }> }) {
    patchCache(next);
    setSaving(true);
    try {
      await landlordApi.updateProperty(propertyId, next);
      queryClient.invalidateQueries({ queryKey: ["properties", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    } catch (err) {
      // Roll the optimistic patch back to server truth.
      queryClient.invalidateQueries({ queryKey: ["properties", propertyId] });
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't save media")
      );
    } finally {
      setSaving(false);
    }
  }

  async function addImages(files: FileList) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadingImages(true);
    try {
      const settled = await Promise.allSettled(
        list.map((f) => landlordApi.uploadPropertyImage(f))
      );
      const urls: string[] = [];
      let failed = 0;
      for (const r of settled) {
        if (r.status === "fulfilled") urls.push(r.value.url);
        else failed++;
      }
      if (urls.length > 0) {
        await persist({ images: [...images, ...urls] });
        toast.success(
          urls.length === 1 ? "Photo added" : `${urls.length} photos added`
        );
      }
      if (failed > 0) {
        toast.error(
          `${failed} ${failed === 1 ? "photo" : "photos"} couldn't be uploaded`
        );
      }
    } finally {
      setUploadingImages(false);
    }
  }

  async function addVideos(files: FileList) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadingVideos(true);
    try {
      const settled = await Promise.allSettled(
        list.map((f) => landlordApi.uploadPropertyVideo(f))
      );
      const urls: string[] = [];
      let failed = 0;
      for (const r of settled) {
        if (r.status === "fulfilled") urls.push(r.value.url);
        else failed++;
      }
      if (urls.length > 0) {
        await persist({ videos: [...videos, ...urls] });
        toast.success(
          urls.length === 1 ? "Video added" : `${urls.length} videos added`
        );
      }
      if (failed > 0) {
        toast.error(
          `${failed} ${failed === 1 ? "video" : "videos"} couldn't be uploaded`
        );
      }
    } finally {
      setUploadingVideos(false);
    }
  }

  async function removeImage(url: string) {
    await persist({
      images: images.filter((u) => u !== url),
      imageCaptions: (property.imageCaptions ?? []).filter((item) => item.url !== url),
    });
  }

  async function moveImage(url: string, direction: -1 | 1) {
    const from = images.indexOf(url);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= images.length) return;
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    await persist({ images: next });
  }

  async function setCover(url: string) {
    if (images[0] === url) return;
    await persist({ images: [url, ...images.filter((image) => image !== url)] });
  }

  async function saveCaption(url: string, caption: string) {
    const trimmed = caption.trim();
    const previous = (property.imageCaptions ?? []).filter((item) => item.url !== url);
    await persist({
      imageCaptions: trimmed ? [...previous, { url, caption: trimmed }] : previous,
    });
  }

  async function removeVideo(url: string) {
    await persist({ videos: videos.filter((u) => u !== url) });
  }

  return (
    <Card className="space-y-5 overflow-hidden p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Photos &amp; video
        </h2>
        {saving && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
      </div>

      {/* Upload controls, both accept multiple files. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadButton
          label="Add photos"
          busyLabel="Uploading photos…"
          icon={<ImagePlus className="h-3.5 w-3.5" />}
          accept="image/jpeg,image/png,image/heic,image/webp"
          busy={uploadingImages}
          disabled={uploadingImages || saving}
          onFiles={addImages}
        />
        {videoUploadLocked ? (
          <button
            type="button"
            onClick={showVideoUpgrade}
            className="flex items-center justify-center gap-2 rounded-full border border-dashed border-cryola-500/55 bg-cryola-300/10 px-4 py-2.5 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-cryola-300/20"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            Upload videos · upgrade
          </button>
        ) : (
          <UploadButton
            label="Add videos"
            busyLabel="Uploading videos…"
            icon={<Film className="h-3.5 w-3.5" />}
            accept="video/mp4,video/quicktime,video/webm"
            busy={uploadingVideos}
            disabled={uploadingVideos || saving}
            onFiles={addVideos}
          />
        )}
      </div>

      {!hasMedia ? (
        <div className="grid aspect-[16/9] w-full place-items-center overflow-hidden rounded-2xl bg-foundation-700/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEFAULT_PROPERTY_IMAGE}
            alt="No media added yet"
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : (
        // Scrollable gallery so a property with many photos/clips stays
        // contained instead of pushing the rest of the page down.
        <div className="max-h-[460px] space-y-5 overflow-y-auto pr-1">
          {images.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Photos · {images.length}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {images.map((url, i) => (
                  <ImageTile
                    key={url}
                    url={url}
                    isCover={i === 0}
                    caption={property.imageCaptions?.find((item) => item.url === url)?.caption ?? ""}
                    busy={saving}
                    onOpen={() => setLightbox({ type: "image", url })}
                    onRemove={() => removeImage(url)}
                    onMoveLeft={() => moveImage(url, -1)}
                    onMoveRight={() => moveImage(url, 1)}
                    onSetCover={() => setCover(url)}
                    onSaveCaption={(caption) => saveCaption(url, caption)}
                    canMoveLeft={i > 0}
                    canMoveRight={i < images.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Videos · {videos.length}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {videos.map((url) => (
                  <VideoTile
                    key={url}
                    url={url}
                    busy={saving}
                    onOpen={() => setLightbox({ type: "video", url })}
                    onRemove={() => removeVideo(url)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {lightbox && (
        <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
      )}
    </Card>
  );
}

function UploadButton({
  label,
  busyLabel,
  icon,
  accept,
  busy,
  disabled,
  onFiles,
}: {
  label: string;
  busyLabel: string;
  icon: React.ReactNode;
  accept: string;
  busy: boolean;
  disabled: boolean;
  onFiles: (files: FileList) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-foundation-700/25 bg-paper px-4 py-2.5 text-[12.5px] font-semibold text-foundation-700 transition hover:border-foundation-700/45 hover:bg-foundation-700/[0.03]">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      <span>{busy ? busyLabel : label}</span>
      <input
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function ImageTile({
  url,
  isCover,
  caption,
  busy,
  onOpen,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onSetCover,
  onSaveCaption,
  canMoveLeft,
  canMoveRight,
}: {
  url: string;
  isCover: boolean;
  caption: string;
  busy: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSetCover: () => void;
  onSaveCaption: (caption: string) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const [draftCaption, setDraftCaption] = useState(caption);
  return (
    <div className="group relative overflow-hidden rounded-xl bg-foundation-700/5">
      <div className="relative aspect-square">
      <button
        type="button"
        onClick={onOpen}
        aria-label="View photo"
        className="block h-full w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
      </button>
      {isCover && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-cryola-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-foundation-700">
          Cover
        </span>
      )}
        <TileRemoveButton busy={busy} onRemove={onRemove} label="Remove photo" />
      </div>
      <div className="flex items-center gap-1 border-t border-foundation-700/10 bg-paper p-1.5">
        <button type="button" disabled={busy || !canMoveLeft} onClick={onMoveLeft} aria-label="Move photo earlier" className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-foundation-700/5 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={busy || !canMoveRight} onClick={onMoveRight} aria-label="Move photo later" className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-foundation-700/5 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
        {!isCover && <button type="button" disabled={busy} onClick={onSetCover} className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-foundation-700 hover:bg-cryola-300/25"><Star className="h-3 w-3" /> Cover</button>}
      </div>
      <input
        aria-label="Photo caption"
        value={draftCaption}
        maxLength={180}
        onChange={(event) => setDraftCaption(event.target.value)}
        onBlur={() => { if (draftCaption !== caption) onSaveCaption(draftCaption); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } }}
        disabled={busy}
        placeholder="Add a caption"
        className="w-full border-t border-foundation-700/10 bg-paper px-2.5 py-2 text-[11px] text-foundation-700 placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}

function VideoTile({
  url,
  busy,
  onOpen,
  onRemove,
}: {
  url: string;
  busy: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  function playPreview() {
    const v = ref.current;
    if (v) void v.play().catch(() => {});
  }
  function stopPreview() {
    const v = ref.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-xl bg-foundation-900/5"
      onMouseEnter={playPreview}
      onMouseLeave={stopPreview}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Play video"
        className="block h-full w-full"
      >
        {/*
          `#t=0.5` makes the browser seek to 0.5s and paint that frame as a
          still preview (otherwise the tile would be black until hover).
          muted + playsInline are required for the hover autoplay to be
          allowed without a click; loop keeps it playing while hovered.
        */}
        <video
          ref={ref}
          src={`${url}#t=0.5`}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </button>
      {/* Play affordance, fades out while the preview is playing on hover. */}
      <span className="pointer-events-none absolute inset-0 grid place-items-center transition group-hover:opacity-0">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-foundation-900/55 text-paper backdrop-blur-sm">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open video"
        className="absolute bottom-1.5 left-1.5 grid h-7 w-7 place-items-center rounded-full bg-foundation-900/60 text-paper opacity-0 transition group-hover:opacity-100"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <TileRemoveButton busy={busy} onRemove={onRemove} label="Remove video" />
    </div>
  );
}

function TileRemoveButton({
  busy,
  onRemove,
  label,
}: {
  busy: boolean;
  onRemove: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      disabled={busy}
      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-foundation-900/70 text-paper opacity-0 transition group-hover:opacity-100 disabled:opacity-40"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function MediaLightbox({
  media,
  onClose,
}: {
  media: NonNullable<Lightbox>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[92vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt=""
            className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain"
          />
        ) : (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-h-[90vh] max-w-[92vw] rounded-2xl bg-black"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-paper text-foundation-700 shadow-lg transition hover:bg-foundation-700/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
