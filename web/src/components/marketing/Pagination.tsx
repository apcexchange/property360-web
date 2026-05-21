import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  baseQuery,
}: {
  page: number;
  totalPages: number;
  baseQuery: URLSearchParams;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number): string {
    const next = new URLSearchParams(baseQuery);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const qs = next.toString();
    return `/listings${qs ? `?${qs}` : ""}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="mt-12 flex items-center justify-between border-t border-foundation-700/10 pt-6">
      <p className="text-[13px] text-ink-muted">
        Page <span className="font-semibold text-foundation-700">{page}</span> of {totalPages}
      </p>
      <div className="flex gap-2">
        <PageButton href={hrefFor(page - 1)} disabled={prevDisabled}>
          ← Previous
        </PageButton>
        <PageButton href={hrefFor(page + 1)} disabled={nextDisabled}>
          Next →
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-full border border-foundation-700/10 px-4 py-2 text-[13px] text-ink-faint">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-full border border-foundation-700/10 bg-surface px-4 py-2 text-[13px] font-medium text-foundation-700 transition hover:bg-foundation-700/5"
    >
      {children}
    </Link>
  );
}
