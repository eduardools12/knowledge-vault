import { ArrowRightIcon, CircleAlertIcon, CircleDotIcon } from "lucide-react";
import Link from "next/link";

import type { Insight } from "@/features/dashboard/insights";
import { cn } from "@/lib/utils";

/**
 * The sentences that make the dashboard worth opening.
 *
 * Each row is a fact plus, where there is something to do about it, the way to
 * do it. Items needing attention get a distinct icon as well as a distinct
 * colour, so the distinction survives greyscale and colour blindness.
 */
export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {insights.map((insight) => {
        const isAttention = insight.tone === "attention";
        const Icon = isAttention ? CircleAlertIcon : CircleDotIcon;

        // The icon sits outside the wrapping box on purpose. With everything in
        // one `flex-wrap` row, a sentence long enough to wrap on a phone pushes
        // the text to the next line and strands the icon alone on the first —
        // the row stops reading as a single statement.
        return (
          <li key={insight.id} className="bg-card flex gap-3 px-4 py-3">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isAttention ? "text-foreground" : "text-muted-foreground/50",
              )}
              aria-hidden="true"
            />

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span
                className={cn("text-sm", isAttention ? "text-foreground" : "text-muted-foreground")}
              >
                {insight.text}
              </span>

              {insight.href && insight.actionLabel ? (
                <Link
                  href={insight.href}
                  className="text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-md text-xs font-medium whitespace-nowrap underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {insight.actionLabel}
                  <ArrowRightIcon className="size-3" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
