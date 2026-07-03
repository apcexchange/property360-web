interface Props {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onChange }: Props) {
  if (total <= limit) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="mt-5 flex items-center justify-between border-t border-rule pt-4 text-[12.5px] text-ink-muted">
      <span className="font-mono tabular text-[12px]">
        <strong className="font-medium text-ink">{start}</strong>,         <strong className="font-medium text-ink">{end}</strong>
        <span className="px-1.5 text-ink-faint">of</span>
        <strong className="font-medium text-ink">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(Math.max(1, page - 1))}
          className="rounded-sm border border-rule-strong bg-surface px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foundation-700 transition hover:bg-paper-deep disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-3 font-mono text-[11.5px] tabular text-ink-faint">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-sm border border-rule-strong bg-surface px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foundation-700 transition hover:bg-paper-deep disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
