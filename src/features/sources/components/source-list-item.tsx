import { PaperclipIcon } from "lucide-react";
import Link from "next/link";

import { TagBadge } from "@/components/tags/tag-badge";
import { Badge } from "@/components/ui/badge";
import type { SourceSummary } from "@/features/sources/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { SOURCE_TYPE_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

export function SourceListItem({ source, now }: { source: SourceSummary; now: Date }) {
  return (
    <li>
      {/* The whole row is the link, same as the knowledge list — a title-only
          target is a small thing to hit, especially on a phone. */}
      <Link
        href={`${ROUTES.sources}/${source.id}`}
        className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{source.title}</span>

              <Badge variant="outline" className="shrink-0">
                {SOURCE_TYPE_LABELS[source.type]}
              </Badge>

              {source.hasFile ? (
                // No `aria-hidden`: the <title> is what gives this icon both
                // its hover tooltip and its accessible name, and the two are
                // mutually exclusive.
                <PaperclipIcon className="text-muted-foreground size-3.5 shrink-0">
                  <title>Tem arquivo anexado</title>
                </PaperclipIcon>
              ) : null}
            </div>

            {source.description ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{source.description}</p>
            ) : null}

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {source.author ? (
                <span className="text-muted-foreground text-xs">{source.author}</span>
              ) : null}

              {source.tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          </div>

          <time
            dateTime={toDateTimeAttribute(source.createdAt)}
            className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
          >
            {formatRelativeTime(source.createdAt, now)}
          </time>
        </div>
      </Link>
    </li>
  );
}
