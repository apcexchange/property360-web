import { AppAuthGate } from "@/components/app/AuthGate";
import { AppSidebar } from "@/components/app/Sidebar";
import { SubscriptionLimitModal } from "@/components/app/SubscriptionLimitModal";
import { QueryProvider } from "@/lib/queryClient";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AppAuthGate>
        <div className="flex min-h-screen bg-canvas">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
        <SubscriptionLimitModal />
      </AppAuthGate>
    </QueryProvider>
  );
}
