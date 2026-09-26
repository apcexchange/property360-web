"use client";
import { useRouter } from "next/navigation";
import { tenantApi } from "@/lib/tenant-api";
import { session } from "@/lib/session";
export function RequestListingDetailsButton({ unitId }: { unitId: string }) {
  const router = useRouter();
  return <button onClick={async () => { if (!session.getToken()) return router.push(`/login?next=${encodeURIComponent(`/listings/${unitId}`)}`); const c = await tenantApi.startListingConversation(unitId); router.push(`/chat/${c.id}`); }} className="w-full rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper">Request details</button>;
}
