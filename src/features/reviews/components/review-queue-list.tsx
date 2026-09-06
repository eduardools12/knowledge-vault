import Link from "next/link";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { Badge } from "@/components/ui/badge";
import type { ReviewQueueItem } from "@/features/reviews/schedule";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { ROUTES } from "@/lib/routes";

export function ReviewQueueList({ items, now }: { items: ReviewQueueItem[]; now: Date }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${ROUTES.reviews}/${item.id}`}
            className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{item.title}</span>

                  {item.area ? (
                    <Badge variant="outline" className="shrink-0">
                      {item.area.name}
                    </Badge>
                  ) : null}
                </div>

                {item.summary ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{item.summary}</p>
                ) : null}

                <LevelIndicator level={item.level} />
              </div>

              <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                {item.nextReviewAt ? (
                  <time dateTime={toDateTimeAttribute(item.nextReviewAt)}>
                    {formatRelativeTime(item.nextReviewAt, now)}
                  </time>
                ) : (
                  "nunca revisado"
                )}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
