import { ArchiveIcon } from "lucide-react";
import Link from "next/link";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeSearchHit, SourceSearchHit } from "@/features/search/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { SOURCE_TYPE_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

/**
 * A note above a group of fuzzy matches.
 *
 * `match_kind` only ever mixes within a group when the exact search found
 * nothing and every row came from the trigram fallback instead — so checking
 * the first hit is enough to know whether the whole list is approximate.
 */
export function FuzzyMatchNotice() {
  return (
    <p className="text-muted-foreground text-xs">
      Nenhum resultado exato. Mostrando títulos parecidos.
    </p>
  );
}

export function KnowledgeSearchResultList({ hits, now }: { hits: KnowledgeSearchHit[]; now: Date }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Link
            href={`${ROUTES.knowledge}/${hit.id}`}
            className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{hit.title}</span>

                  {hit.status === "draft" ? (
                    <Badge variant="outline" className="shrink-0">
                      Rascunho
                    </Badge>
                  ) : null}

                  {hit.status === "archived" ? (
                    <Badge variant="secondary" className="shrink-0">
                      <ArchiveIcon className="size-3" aria-hidden="true" />
                      Arquivado
                    </Badge>
                  ) : null}
                </div>

                {hit.summary ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{hit.summary}</p>
                ) : null}

                <LevelIndicator level={hit.level} />
              </div>

              <time
                dateTime={toDateTimeAttribute(hit.updatedAt)}
                className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
              >
                {formatRelativeTime(hit.updatedAt, now)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SourceSearchResultList({ hits, now }: { hits: SourceSearchHit[]; now: Date }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Link
            href={`${ROUTES.sources}/${hit.id}`}
            className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{hit.title}</span>

                  <Badge variant="outline" className="shrink-0">
                    {SOURCE_TYPE_LABELS[hit.type]}
                  </Badge>
                </div>

                {hit.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{hit.description}</p>
                ) : null}

                {hit.author ? <span className="text-muted-foreground text-xs">{hit.author}</span> : null}
              </div>

              <time
                dateTime={toDateTimeAttribute(hit.createdAt)}
                className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
              >
                {formatRelativeTime(hit.createdAt, now)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
