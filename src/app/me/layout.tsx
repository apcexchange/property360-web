import { TenantAuthGate } from "@/components/me/AuthGate";
import { TenantSidebar } from "@/components/me/Sidebar";
import { SidebarProvider } from "@/components/app/SidebarContext";
import { QueryProvider } from "@/lib/queryClient";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <TenantAuthGate>
        <SidebarProvider>
          <div className="flex min-h-screen bg-canvas">
            <TenantSidebar />
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          </div>
        </SidebarProvider>
      </TenantAuthGate>
    </QueryProvider>
  );
}
