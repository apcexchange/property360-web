"use client";

import { useEffect, useRef } from "react";
import { trackMeta } from "@/lib/meta-pixel";

// Fires a single Meta event when mounted. Lets server components (e.g. /agents)
// emit a "ViewContent" without becoming client components themselves — just
// drop <MetaTrack event="ViewContent" params={{ content_name: "agents" }} />.
export function MetaTrack({
  event,
  params,
}: {
  event: string;
  params?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackMeta(event, params);
    // Fire once on mount; event/params are stable per page render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
