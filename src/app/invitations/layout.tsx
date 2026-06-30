import { QueryProvider } from "@/lib/queryClient";

// Standalone public invitation-accept flow (linked from email). It lives
// outside the /app and /me route groups, so it needs its own React Query
// provider, without it the page's useQuery calls throw "No QueryClient set".
export default function InvitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
