"use client";

import { useParams } from "next/navigation";
import { AppTopbar } from "@/components/app/Topbar";
import { ChatInbox } from "@/components/chat/ChatInbox";

export default function ChatThreadPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <AppTopbar title="Messages" subtitle="One conversation per property" />
      <ChatInbox
        scope="app"
        activeId={id ?? null}
        emptyBody="When a tenant or agent messages you about a property, the thread shows up here."
      />
    </>
  );
}
