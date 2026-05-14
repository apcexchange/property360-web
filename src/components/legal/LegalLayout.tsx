import Link from "next/link";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-foundation-700">
      {/* Lightweight header — no full Nav so legal pages stay focused */}
      <header className="border-b border-border bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
              P
            </span>
            <span className="text-lg text-foundation-700">Property360</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink-muted">
            <Link href="/support" className="hover:text-foundation-700">Support</Link>
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
            <Link href="/delete-account" className="hover:text-foundation-700">Delete account</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foundation-700 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">Last updated: {updated}</p>
        </div>

        <article className="prose-legal mt-10 text-foundation-700">
          {children}
        </article>
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Property360. Lagos, Nigeria.</p>
          <div className="flex items-center gap-5">
            <Link href="/support" className="hover:text-foundation-700">Support</Link>
            <Link href="/privacy" className="hover:text-foundation-700">Privacy</Link>
            <Link href="/terms" className="hover:text-foundation-700">Terms</Link>
            <Link href="/delete-account" className="hover:text-foundation-700">Delete account</Link>
            <a href="mailto:legal@property360.africa" className="hover:text-foundation-700">
              legal@property360.africa
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
