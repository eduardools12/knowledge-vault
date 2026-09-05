import Link from "next/link";

import { INBOX_STATUSES, INBOX_STATUS_LABELS, type InboxStatus } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * The four states of the queue, as tabs rather than a `Select`.
 *
 * A queue is meant to be worked through one state at a time, so switching
 * between them is the single most frequent action on this page — a row of
 * links that shows every count at once earns its keep here in a way it
 * would not on a filter with many independent values.
 */
export function InboxStatusTabs({
  active,
  counts,
}: {
  active?: InboxStatus;
  counts: Record<InboxStatus, number>;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <nav aria-label="Filtrar por status" className="mb-6 flex flex-wrap gap-2">
      <Tab href={ROUTES.inbox} active={!active} label="Todos" count={total} />

      {INBOX_STATUSES.map((status) => (
        <Tab
          key={status}
          href={`${ROUTES.inbox}?status=${status}`}
          active={active === status}
          label={INBOX_STATUS_LABELS[status]}
          count={counts[status]}
        />
      ))}
    </nav>
  );
}

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "bg-foreground text-background" : "hover:bg-accent",
      )}
    >
      {label} <span className="tabular-nums">({count})</span>
    </Link>
  );
}
