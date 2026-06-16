/**
 * Small unread-count pill shown next to a sidebar nav item (e.g. Messages).
 * Renders nothing when count is 0 so items without unread stay clean.
 * Cryola lime on the dark sidebar reads as a clear "new" signal.
 */
export function NavBadge({ count }: { count: number }) {
  if (!count || count < 1) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cryola-400 px-1.5 text-[10.5px] font-bold leading-none text-foundation-700"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
