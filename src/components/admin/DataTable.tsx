import { TableSkeleton } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";

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
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { _id?: string; id?: string }>({
  columns,
  rows,
  loading,
  empty = "No records",
  emptyDescription,
  onRowClick,
}: Props<T>) {
  return (
    <div className="overflow-hidden border border-rule bg-surface">
      {loading ? (
        <TableSkeleton rows={6} cols={columns.length} />
      ) : rows.length === 0 ? (
        <EmptyState title={empty} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-foundation-700">
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    className={`px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700 ${c.className ?? ""}`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={(row._id ?? row.id ?? i) as string}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-rule last:border-b-0 transition-colors ${
                    onRowClick
                      ? "cursor-pointer hover:bg-cryola-50/70"
                      : "hover:bg-cryola-50/40"
                  }`}
                >
                  {columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className={`px-4 py-3.5 align-middle text-[14px] text-ink-body ${c.className ?? ""}`}
                    >
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key as string] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "muted" | "info";

const TONE_BY_STATUS: Record<string, Tone> = {
  // success-leaning
  verified: "success",
  completed: "success",
  active: "success",
  paid: "success",
  success: "success",
  // warning-leaning
  pending: "warning",
  not_started: "warning",
  partially_paid: "warning",
  processing: "warning",
  sent: "warning",
  // danger
  rejected: "danger",
  failed: "danger",
  overdue: "danger",
  terminated: "danger",
  declined: "danger",
  reversed: "danger",
  cancelled: "danger",
  // muted
  expired: "muted",
  draft: "muted",
  dismissed: "muted",
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-cryola-500",
  warning: "bg-amber-500",
  danger: "bg-error",
  muted: "bg-ink-faint",
  info: "bg-info",
};

const TONE_TEXT: Record<Tone, string> = {
  success: "text-foundation-700",
  warning: "text-amber-800",
  danger: "text-error",
  muted: "text-ink-muted",
  info: "text-info",
};

export function StatusBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  const tone = TONE_BY_STATUS[value] ?? "muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em] ${TONE_TEXT[tone]}`}
    >
      <span
        aria-hidden
        className={`inline-block h-[7px] w-[7px] rounded-full ${TONE_DOT[tone]}`}
      />
      {value.replace(/_/g, " ")}
    </span>
  );
}
