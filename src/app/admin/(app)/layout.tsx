import { Sidebar } from "@/components/admin/Sidebar";
import { AuthGate } from "@/components/admin/AuthGate";
import { QueryProvider } from "@/lib/queryClient";

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthGate>
        <div className="flex min-h-screen bg-canvas">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </AuthGate>
    </QueryProvider>
  );
}
