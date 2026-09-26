import type { Metadata } from "next";
import { EmailPreferencePage } from "@/components/email/EmailPreferencePage";

export const metadata: Metadata = {
  title: "Unsubscribe | Property360",
  robots: { index: false, follow: false },
};

export default function EmailUnsubscribePage() {
  return <EmailPreferencePage action="unsubscribe" />;
}
