"use client";

import { AppTopbar } from "@/components/app/Topbar";
import { ChatInbox } from "@/components/chat/ChatInbox";

export default function ChatListPage() {
  return (
    <>
      <AppTopbar title="Messages" subtitle="One conversation per property" />
      <ChatInbox
        scope="app"
        activeId={null}
        emptyBody="When a tenant or agent messages you about a property, the thread shows up here."
      />
    </>
  );
}
