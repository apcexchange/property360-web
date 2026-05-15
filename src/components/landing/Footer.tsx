import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-foundation-700/10 bg-paper py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foundation-700 text-cryola-300">
                <span className="text-[13px] font-bold leading-none">P</span>
              </span>
              <span className="text-[15px] text-foundation-700">
                Property<span className="text-cryola-500">360</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.6] text-ink-muted">
              Property management for the way Nigeria rents — built in Lagos.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink href="#why">Why Property360</FooterLink>
            <FooterLink href="#how">How it works</FooterLink>
            <FooterLink href="#features">Features</FooterLink>
            <FooterLink href="#marketplace">Marketplace</FooterLink>
            <FooterLink href="#download">Download</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink href="mailto:hello@property360.africa">Contact</FooterLink>
            <FooterLink href="/support">Support</FooterLink>
            <FooterLink href="mailto:partnerships@property360.africa">Partnerships</FooterLink>
          </FooterCol>

          <FooterCol title="Legal">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/delete-account">Delete account</FooterLink>
            <FooterLink href="/admin">Admin login</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-foundation-700/10 pt-6 text-[13px] text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Property360 · Lagos, Nigeria.</p>
          <p className="flex items-center gap-2 text-[12px]">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-cryola-500" />
            Made for landlords, tenants, and agents
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-foundation-700">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="text-[13.5px] text-ink-muted transition-colors hover:text-foundation-700"
      >
        {children}
      </a>
    </li>
  );
}
