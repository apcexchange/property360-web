"use client";

import { useEffect } from "react";

// After a new deploy, any tab still running the previous build references that
// build's content-hashed chunks. The next lazy route/import then 404s with a
// ChunkLoadError (e.g. clicking "Login" loads the login route's old chunk).
// Recover transparently: reload once to pull fresh HTML + chunk hashes.
//
// A sessionStorage cooldown prevents a reload loop — if the failure is NOT a
// stale deploy (genuinely broken build), the second occurrence inside the
// window is left to surface instead of reloading forever.
const RELOAD_GUARD_KEY = "p360_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 10_000;

function isChunkLoadError(value: unknown): boolean {
  const message =
    value instanceof Error
      ? `${value.name}: ${value.message}`
      : typeof value === "string"
        ? value
        : "";
  return /ChunkLoadError|Loading chunk [\w]+ failed|Failed to load chunk|error loading dynamically imported module/i.test(
    message
  );
}

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return; // already tried recently
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode / quota) — reload anyway; the
    // worst case without the guard is one extra reload.
  }
  window.location.reload();
}

/**
 * Mounted once in the root layout. Listens globally for chunk-load failures
 * (both thrown errors and rejected dynamic-import promises) and self-heals a
 * stale-deploy mismatch with a single reload.
 */
export function ChunkErrorReloader() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) reloadOnce();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
