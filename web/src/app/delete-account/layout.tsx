import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "Request deletion of your Property360 account and personal data. We respond within 30 days, in line with the Nigeria Data Protection Act.",
  alternates: { canonical: "https://property360.africa/delete-account" },
};

export default function DeleteAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
