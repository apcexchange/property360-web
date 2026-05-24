"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PenLine, Upload as UploadIcon, X } from "lucide-react";

export type SignatureMethod = "drawn" | "uploaded";

interface Props {
  onChange: (
    blob: Blob | null,
    method: SignatureMethod | null,
    previewUrl: string | null
  ) => void;
  /** Lets the parent reset the capture (eg. on submit success). */
  resetSignal?: number;
}

/**
 * Two-tab signature capture: Draw on canvas, or Upload an image file.
 * Emits a PNG `Blob` and the method via onChange. Optional — parent can
 * submit without ever capturing if the signer prefers typed name alone.
 */
export function SignatureCapture({ onChange, resetSignal }: Props) {
  const [mode, setMode] = useState<SignatureMethod>("drawn");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const padRef = useRef<SignatureCanvas | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resetSignal == null) return;
    clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearAll() {
    padRef.current?.clear();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    onChange(null, null, null);
  }

  async function commitDrawnSignature() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onChange(null, null, null);
      return;
    }
    // Use the trimmed canvas so we don't pass huge whitespace borders.
    const dataUrl = pad.getTrimmedCanvas().toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const url = URL.createObjectURL(blob);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    onChange(blob, "drawn", url);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onChange(null, null, null);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    onChange(f, "uploaded", url);
  }

  return (
    <div className="rounded-2xl border border-foundation-700/10 bg-paper p-4">
      <div className="mb-3 flex gap-2 rounded-full bg-foundation-700/5 p-1 text-[12px] font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode("drawn");
            // switching tabs clears the previous mode's capture
            clearAll();
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 ${
            mode === "drawn"
              ? "bg-foundation-700 text-paper"
              : "text-foundation-700"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" /> Draw
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("uploaded");
            clearAll();
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 ${
            mode === "uploaded"
              ? "bg-foundation-700 text-paper"
              : "text-foundation-700"
          }`}
        >
          <UploadIcon className="h-3.5 w-3.5" /> Upload
        </button>
      </div>

      {mode === "drawn" ? (
        <div>
          <div className="overflow-hidden rounded-xl border border-dashed border-foundation-700/20 bg-foundation-700/5">
            <SignatureCanvas
              ref={(r) => {
                padRef.current = r;
              }}
              penColor="#0c2027"
              backgroundColor="rgba(255,255,255,0)"
              canvasProps={{
                width: 600,
                height: 180,
                className: "w-full max-w-full bg-white",
              }}
              onEnd={commitDrawnSignature}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11.5px] text-ink-muted">
              Draw with mouse or finger. Optional — typed name alone still
              signs.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1 text-[11.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foundation-700/20 bg-foundation-700/5 px-4 py-6 text-center transition hover:bg-foundation-700/10"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Signature preview"
                className="max-h-32 object-contain"
              />
            ) : (
              <>
                <UploadIcon className="h-5 w-5 text-foundation-700" />
                <p className="text-[13px] font-semibold text-foundation-700">
                  Click to choose an image
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  JPEG, PNG, HEIC, or WebP · 5 MB max
                </p>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-end">
            {previewUrl && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1 text-[11.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      )}
    </div>
  );
}
