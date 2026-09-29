"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import { api } from "@/lib/api";
import { session } from "@/lib/session";

const subscribe = () => () => {};

export function SaveListingButton({ unitId, listingHref }: { unitId: string; listingHref: string }) {
  const router = useRouter();
  const signedIn = useSyncExternalStore(subscribe, () => Boolean(session.getToken()), () => false);
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);
  const onClick = async () => {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(listingHref)}`);
    setWorking(true);
    try {
      if (saved) { await api.delete(`/listings/${unitId}/save`); setSaved(false); }
      else { await api.post(`/listings/${unitId}/save`); setSaved(true); }
    } finally { setWorking(false); }
  };
  return <button type="button" onClick={() => void onClick()} disabled={working} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foundation-900/80 px-3 text-[12px] font-semibold text-paper backdrop-blur-sm transition hover:bg-foundation-900 disabled:opacity-60">
    {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}{saved ? "Saved" : "Save"}
  </button>;
}
