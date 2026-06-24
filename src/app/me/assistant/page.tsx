"use client";

import { TenantTopbar } from "@/components/me/Topbar";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export default function TenantAssistantPage() {
  return (
    <>
      <TenantTopbar
        title="AI Assistant"
        subtitle="Ask about your balance, rent, and lease"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6">
        <AssistantChat
          suggestions={[
            "What's my balance?",
            "When is rent due?",
            "My lease fee breakdown",
          ]}
        />
      </div>
    </>
  );
}
