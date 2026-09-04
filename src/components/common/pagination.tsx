import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Previous / next paging.
 *
 * Numbered pages are deliberately not offered: with search and filters in the
 * URL, "page 7" is a position in a result set the user is about to change, not
 * a place worth linking to directly.
 */
export function Pagination({
  page,
  pageCount,
  total,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <nav
      aria-label="Paginação"
      className="mt-6 flex items-center justify-between gap-4 text-sm"
    >
      <p className="text-muted-foreground" aria-live="polite">
        Página {page} de {pageCount} · {total} {total === 1 ? "resultado" : "resultados"}
      </p>

      <div className="flex items-center gap-2">
        {/*
          A disabled <button> rather than a dead link at the ends: a link that
          goes nowhere is still focusable and still announced as a link.
        */}
        {hasPrevious ? (
          <Button
            nativeButton={false}
            render={<Link href={buildHref(page - 1)} />}
            variant="outline"
            size="sm"
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
            Anterior
          </Button>
        )}

        {hasNext ? (
          <Button
            nativeButton={false}
            render={<Link href={buildHref(page + 1)} />}
            variant="outline"
            size="sm"
          >
            Próxima
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
