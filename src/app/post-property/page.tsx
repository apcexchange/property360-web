import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ClipboardCheck, Home, MapPin, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = { title: "Post a property free", description: "List homes, shortlets, shops, commercial spaces and land on Property360 for free." };

const STEPS = [
  ["Add the property", "Choose rent, sale or shortlet and enter the location, price and property details.", MapPin],
  ["Upload real photos", "Add at least one clear property photo. You can upload up to ten.", Camera],
  ["Confirm authority", "Confirm that you own the property or are authorised by its owner to advertise it.", ShieldCheck],
  ["Review and publish", "Our team reviews the listing before it is shown publicly in the marketplace.", ClipboardCheck],
] as const;

export default function PostPropertyPage() {
  return <div className="min-h-screen bg-paper text-foundation-700"><Nav /><main>
    <section className="border-b border-foundation-700/10 bg-paper-deep/40 py-20 sm:py-28"><div className="mx-auto max-w-6xl px-6"><p className="eyebrow">Property360 marketplace</p><div className="mt-5 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[.98] tracking-[-.04em]">Post your property.<br /><span className="text-cryola-500">Standard listings are free.</span></h1><p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-ink-muted">Reach people looking for homes, shortlets, shops, commercial space and land—without paying rent commission to Property360.</p></div><div className="rounded-2xl border border-foundation-700/10 bg-surface p-6"><Home className="h-7 w-7 text-cryola-500" /><p className="mt-4 text-[15px] font-semibold">What you can list</p><p className="mt-2 text-[14px] leading-relaxed text-ink-muted">Apartments, houses, rooms, shortlets, hostels, shops, offices, commercial spaces and plots of land.</p></div></div><div className="mt-9 flex flex-wrap gap-3"><Link href="/onboarding" className="rounded-full bg-foundation-700 px-6 py-3 text-[14px] font-semibold text-paper transition hover:bg-foundation-800">Post a property free</Link><Link href="/listings" className="rounded-full border border-foundation-700/15 px-6 py-3 text-[14px] font-semibold">Browse properties</Link></div></div></section>
    <section className="mx-auto max-w-6xl px-6 py-20"><p className="eyebrow">How it works</p><h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.03em]">A safer way to list.</h2><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map(([title, body, Icon], index) => <div key={title} className="border-t border-foundation-700/15 pt-5"><span className="text-[11px] font-semibold text-cryola-600">0{index + 1}</span><Icon className="mt-5 h-5 w-5 text-foundation-700" /><h3 className="mt-4 text-[16px] font-semibold">{title}</h3><p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{body}</p></div>)}</div></section>
    <section className="border-y border-foundation-700/10 bg-paper-deep/40 py-16"><div className="mx-auto max-w-3xl px-6"><h2 className="font-display text-[28px] font-extrabold tracking-[-.025em]">Before you post</h2><ul className="mt-6 space-y-3 text-[14px] leading-relaxed text-ink-muted"><li>Use accurate prices, availability and location details.</li><li>Use photos of the actual property—at least one photo is required for approval.</li><li>Only post a property you own or have explicit authority to advertise.</li><li>Listings are periodically reconfirmed to reduce stale results.</li></ul></div></section>
  </main><Footer /></div>;
}
