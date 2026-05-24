import { AppAuthGate } from "@/components/app/AuthGate";
import { AppSidebar } from "@/components/app/Sidebar";
import { SidebarProvider } from "@/components/app/SidebarContext";
import { SubscriptionGate } from "@/components/app/SubscriptionGate";
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
        <SidebarProvider>
          <div className="flex min-h-screen bg-canvas">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <SubscriptionGate>{children}</SubscriptionGate>
            </div>
          </div>
          <SubscriptionLimitModal />
        </SidebarProvider>
      </AppAuthGate>
    </QueryProvider>
  );
}
