export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-paper-deep ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {/* Mock header rule */}
      <div className="border-b border-rule-strong px-4 py-3.5">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-2 flex-1 max-w-24" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-6 border-b border-rule px-4 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
