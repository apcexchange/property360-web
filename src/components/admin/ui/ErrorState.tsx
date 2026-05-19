interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. The API may be temporarily unavailable.",
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center border border-error/30 bg-error/5 px-6 py-12 text-center">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-error">
        Notice
      </span>
      <p className="mt-3 font-display text-[19px] font-medium tracking-[-0.015em] text-ink">
        {title}
      </p>
      <p className="mt-2 max-w-sm font-display text-[14px] italic text-ink-muted">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-sm border border-rule-strong bg-surface px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foundation-700 transition hover:bg-paper-deep"
        >
          Try again
        </button>
      )}
    </div>
  );
}
