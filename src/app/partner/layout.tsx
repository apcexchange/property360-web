import { QueryProvider } from "@/lib/queryClient";
import { PartnerAuthGate } from "@/components/partner/AuthGate";
import { PartnerSidebar } from "@/components/partner/Sidebar";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <PartnerAuthGate>
        <div className="flex min-h-screen bg-canvas">
          <PartnerSidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </PartnerAuthGate>
    </QueryProvider>
  );
}
