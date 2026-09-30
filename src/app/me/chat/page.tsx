"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TenantTopbar } from "@/components/me/Topbar";
import { ChatInbox } from "@/components/chat/ChatInbox";

function TenantInbox() {
  // `?c=<conversationId>` selects a thread (set by the lease summary, the
  // listing chat panel and the inbox rows themselves).
  const activeId = useSearchParams()?.get("c") ?? null;
  return (
    <ChatInbox
      scope="me"
      activeId={activeId}
      emptyBody="Message a landlord from any listing, or your landlord from your lease summary."
    />
  );
}

export default function TenantChatPage() {
  return (
    <>
      <TenantTopbar title="Chat" subtitle="One conversation per property" />
      <Suspense>
        <TenantInbox />
      </Suspense>
    </>
  );
}
