import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What a section shows when it holds nothing yet.
 *
 * For a knowledge vault this is not an edge case — it is the state on day one,
 * and the state of every section the user has not adopted yet. So it explains
 * what the section is for and offers the next step, rather than printing
 * "nenhum resultado" and leaving the user to work it out.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}

      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm text-balance">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
