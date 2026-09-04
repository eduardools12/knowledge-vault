import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One headline number.
 *
 * The number is rendered in tabular figures so a row of cards does not jitter
 * as the counts change width. When a `href` is given the whole card becomes the
 * link — a small number is a small click target otherwise.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  /** Marks a count that is asking for action rather than just reporting. */
  highlight?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        <Icon
          className={cn("size-4", highlight ? "text-foreground" : "text-muted-foreground/60")}
          aria-hidden="true"
        />
      </div>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </>
  );

  const className = cn(
    "flex flex-col gap-2 rounded-lg border p-4 transition-colors",
    highlight && value > 0 && "border-foreground/20 bg-accent/40",
    href && "hover:bg-accent/60 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
