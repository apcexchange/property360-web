"use client";

import { AppTopbar } from "@/components/app/Topbar";
import { PageContainer } from "@/components/app/ui";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export default function AssistantPage() {
  return (
    <>
      <AppTopbar
        title="AI Assistant"
        subtitle="Ask about your arrears, collections, and expiring leases"
      />
      <PageContainer>
        <AssistantChat
          suggestions={[
            "What's overdue?",
            "Leases expiring in 60 days",
            "This month's collection",
          ]}
        />
      </PageContainer>
    </>
  );
}
