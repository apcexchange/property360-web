type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
}

export function DataTable<T extends { _id?: string; id?: string }>({
  columns,
  rows,
  loading,
  empty = "No records",
}: Props<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-canvas">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted ${c.className ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-ink-muted"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-ink-muted"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={(row._id ?? row.id) as string} className="hover:bg-canvas/60">
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className={`px-4 py-3 text-sm text-foundation-700 ${c.className ?? ""}`}
                    >
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key as string] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-ink-muted">—</span>;
  const tone =
    value === "verified" || value === "completed" || value === "active"
      ? "bg-green-50 text-green-700 border-green-200"
      : value === "pending" || value === "not_started"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : value === "rejected" || value === "failed"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-foundation-50 text-foundation-700 border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
