import { ArchiveIcon } from "lucide-react";
import Link from "next/link";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { TagBadge } from "@/components/tags/tag-badge";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeSummary } from "@/features/knowledge/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { ROUTES } from "@/lib/routes";

export function KnowledgeListItem({ item, now }: { item: KnowledgeSummary; now: Date }) {
  return (
    <li>
      {/*
        The whole row is the link. A title-only target is a small thing to hit,
        especially on a phone, and the rest of the row looks clickable anyway.
      */}
      <Link
        href={`${ROUTES.knowledge}/${item.id}`}
        className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{item.title}</span>

              {item.status === "draft" ? (
                <Badge variant="outline" className="shrink-0">
                  Rascunho
                </Badge>
              ) : null}

              {item.status === "archived" ? (
                <Badge variant="secondary" className="shrink-0">
                  <ArchiveIcon className="size-3" aria-hidden="true" />
                  Arquivado
                </Badge>
              ) : null}
            </div>

            {item.summary ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{item.summary}</p>
            ) : null}

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <LevelIndicator level={item.level} />
              {item.area ? (
                <span className="text-muted-foreground truncate text-xs">{item.area.name}</span>
              ) : null}
              {item.tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
            </div>
          </div>

          <time
            dateTime={toDateTimeAttribute(item.updatedAt)}
            className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
          >
            {formatRelativeTime(item.updatedAt, now)}
          </time>
        </div>
      </Link>
    </li>
  );
}
