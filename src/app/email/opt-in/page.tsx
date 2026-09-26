import type { Metadata } from "next";
import { EmailPreferencePage } from "@/components/email/EmailPreferencePage";

export const metadata: Metadata = {
  title: "Tips and offers | Property360",
  robots: { index: false, follow: false },
};

export default function EmailOptInPage() {
  return <EmailPreferencePage action="opt-in" />;
}
