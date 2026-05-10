import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-canvas py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-foundation-700 text-cryola-300">
                P
              </span>
              <span className="text-lg text-foundation-700">Property360</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-muted">
              Property management for the way Nigeria rents — built in Lagos.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink href="#why">Why Property360</FooterLink>
            <FooterLink href="#how">How it works</FooterLink>
            <FooterLink href="#features">Features</FooterLink>
            <FooterLink href="#download">Download</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink href="mailto:hello@property360.africa">Contact</FooterLink>
            <FooterLink href="mailto:support@property360.africa">Support</FooterLink>
            <FooterLink href="mailto:partnerships@property360.africa">Partnerships</FooterLink>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/delete-account">Delete account</FooterLink>
            <FooterLink href="/admin">Admin login</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Property360. Lagos, Nigeria.</p>
          <p className="text-xs">Made with care for landlords, tenants, and agents 🇳🇬</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-foundation-700">
        {title}
      </h4>
      <ul className="mt-4 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="text-sm text-ink-muted transition hover:text-foundation-700"
      >
        {children}
      </a>
    </li>
  );
}
