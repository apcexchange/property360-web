import { QueryProvider } from "@/lib/queryClient";

// Standalone guarantor-invite flow (linked from email/SMS), outside the /app
// and /me route groups. Provide React Query here so the page's useQuery /
// useMutation calls have a client — otherwise they throw "No QueryClient set".
export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
