import { LibraryBigIcon, PlusIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { listAreas } from "@/features/areas/queries";
import { KnowledgeFilters } from "@/features/knowledge/components/knowledge-filters";
import { KnowledgeListItem } from "@/features/knowledge/components/knowledge-list-item";
import { listKnowledge } from "@/features/knowledge/queries";
import { knowledgeFiltersSchema } from "@/features/knowledge/schemas";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Conhecimentos",
};

export default async function KnowledgeListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // Parsed with `.catch(undefined)` per field, so a hand-edited or stale URL
  // degrades to the unfiltered list instead of an error page.
  const filters = knowledgeFiltersSchema.parse(raw);

  const [{ items, total, page, pageCount }, areas] = await Promise.all([
    listKnowledge(filters),
    listAreas(),
  ]);
  const now = new Date();

  const isFiltered = Boolean(filters.q || filters.level || filters.status || filters.area);

  function buildHref(nextPage: number): string {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.level) params.set("level", filters.level);
    if (filters.status) params.set("status", filters.status);
    if (filters.area) params.set("area", filters.area);
    if (nextPage > 1) params.set("page", String(nextPage));

    const search = params.toString();

    return search ? `${ROUTES.knowledge}?${search}` : ROUTES.knowledge;
  }

  return (
    <>
      <PageHeader
        title="Conhecimentos"
        description="O que você aprendeu, com contexto e conexões."
        action={
          <ButtonLink href={`${ROUTES.knowledge}/novo`}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Novo
          </ButtonLink>
        }
      />

      {/*
        `useSearchParams` inside the filters needs a Suspense boundary so it
        does not opt the whole route out of streaming.
      */}
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <KnowledgeFilters
          defaultQuery={filters.q}
          defaultLevel={filters.level}
          defaultStatus={filters.status}
          defaultArea={filters.area}
          areas={areas}
        />
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
            icon={LibraryBigIcon}
            title="Nenhum conhecimento ainda"
            description="Um conhecimento é algo que você entendeu e quer poder consultar depois — não precisa estar completo para ser registrado."
            action={
              <ButtonLink href={`${ROUTES.knowledge}/novo`} size="lg">
                Criar o primeiro
              </ButtonLink>
            }
          />
        )
      ) : (
        <>
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {items.map((item) => (
              <KnowledgeListItem key={item.id} item={item} now={now} />
            ))}
          </ul>

          <Pagination page={page} pageCount={pageCount} total={total} buildHref={buildHref} />
        </>
      )}
    </>
  );
}
