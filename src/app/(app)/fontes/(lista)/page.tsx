import { BookMarkedIcon, PlusIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SourceFilters } from "@/features/sources/components/source-filters";
import { SourceListItem } from "@/features/sources/components/source-list-item";
import { listSources } from "@/features/sources/queries";
import { sourceFiltersSchema } from "@/features/sources/schemas";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Fontes",
};

export default async function SourcesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // Parsed with `.catch(undefined)` per field, so a hand-edited or stale URL
  // degrades to the unfiltered list instead of an error page.
  const filters = sourceFiltersSchema.parse(raw);

  const { items, total, page, pageCount } = await listSources(filters);
  const now = new Date();

  const isFiltered = Boolean(filters.q || filters.type);

  function buildHref(nextPage: number): string {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (nextPage > 1) params.set("page", String(nextPage));

    const search = params.toString();

    return search ? `${ROUTES.sources}?${search}` : ROUTES.sources;
  }

  return (
    <>
      <PageHeader
        title="Fontes"
        description="De onde o conhecimento veio: artigos, livros, vídeos, cursos, papers e o resto."
        action={
          <ButtonLink href={`${ROUTES.sources}/nova`}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Nova
          </ButtonLink>
        }
      />

      {/*
        `useSearchParams` inside the filters needs a Suspense boundary so it
        does not opt the whole route out of streaming.
      */}
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <SourceFilters defaultQuery={filters.q} defaultType={filters.type} />
      </Suspense>

      {items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Nenhum resultado"
            description="Nada corresponde a esses filtros. Tente outros termos ou limpe os filtros."
          />
        ) : (
          <EmptyState
            icon={BookMarkedIcon}
            title="Nenhuma fonte ainda"
            description="Uma fonte é onde um conhecimento veio de fato: um artigo, um livro, um vídeo. Anexe um arquivo ou apenas registre a referência."
            action={
              <ButtonLink href={`${ROUTES.sources}/nova`} size="lg">
                Criar a primeira
              </ButtonLink>
            }
          />
        )
      ) : (
        <>
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {items.map((item) => (
              <SourceListItem key={item.id} source={item} now={now} />
            ))}
          </ul>

          <Pagination page={page} pageCount={pageCount} total={total} buildHref={buildHref} />
        </>
      )}
    </>
  );
}
