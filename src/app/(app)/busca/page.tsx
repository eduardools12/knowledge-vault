import { SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { AskVaultButton } from "@/features/search/components/ask-vault";
import { SearchFilters } from "@/features/search/components/search-filters";
import {
  FuzzyMatchNotice,
  KnowledgeSearchResultList,
  SourceSearchResultList,
} from "@/features/search/components/search-results";
import { search } from "@/features/search/queries";
import { hasAnySearchFilter, searchFiltersSchema } from "@/features/search/schemas";
import { listTags } from "@/features/tags/queries";

export const metadata: Metadata = {
  title: "Buscar",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // `.catch(undefined)` per field: a stale or hand-edited URL degrades to no
  // filters instead of an error page.
  const filters = searchFiltersSchema.parse(raw);

  const [areas, tags, results] = await Promise.all([listAreas(), listTags(), search(filters)]);
  const areaOptions = flattenAreaTree(buildAreaTree(areas)).map((area) => ({
    id: area.id,
    // Indentation reads oddly in a flat filter list — the tree only matters
    // when picking a parent or an area to file something under.
    name: area.name,
  }));
  const now = new Date();

  const isFiltered = hasAnySearchFilter(filters);
  // A group is "all fuzzy" only when the trigram fallback found something and
  // nothing exact did — the check `search_knowledge`/`search_sources` already
  // enforce internally. It can no longer be read off the first hit alone:
  // since Etapa 11, a semantic-only hit can sort ahead of a fuzzy one after
  // Reciprocal Rank Fusion, so every hit in the group has to be considered.
  const knowledgeIsFuzzy =
    results.knowledge.some((hit) => hit.matchKind === "fuzzy") &&
    !results.knowledge.some((hit) => hit.matchKind === "exact");
  const sourcesIsFuzzy =
    results.sources.some((hit) => hit.matchKind === "fuzzy") &&
    !results.sources.some((hit) => hit.matchKind === "exact");
  const total = results.knowledge.length + results.sources.length;

  return (
    <>
      <PageHeader
        title="Buscar"
        description="Em conhecimentos e fontes ao mesmo tempo, com os filtros que fizerem sentido."
      />

      <Suspense fallback={<div className="mb-6 h-[4.5rem]" />}>
        <SearchFilters
          defaultQuery={filters.q}
          defaultArea={filters.area}
          defaultTag={filters.tag}
          defaultLevel={filters.level}
          defaultStatus={filters.status}
          defaultSourceType={filters.sourceType}
          areas={areaOptions}
          tags={tags.map((tag) => ({ id: tag.id, name: tag.name }))}
        />
      </Suspense>

      {filters.q ? (
        <div className="mb-6">
          <AskVaultButton filters={filters} />
        </div>
      ) : null}

      {!isFiltered ? (
        <EmptyState
          icon={SearchXIcon}
          title="Digite algo para buscar"
          description="Busca por palavra-chave em título, resumo e conteúdo, ou combine os filtros abaixo sem digitar nada."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="Nenhum resultado"
          description="Nada corresponde a essa busca ou a esses filtros. Tente outros termos ou remova algum filtro."
        />
      ) : (
        <div className="grid gap-8">
          {results.knowledge.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">Conhecimentos ({results.knowledge.length})</h2>
              {knowledgeIsFuzzy ? <FuzzyMatchNotice /> : null}
              <KnowledgeSearchResultList hits={results.knowledge} now={now} />
            </section>
          ) : null}

          {results.sources.length > 0 ? (
            <section className="grid gap-3">
              <h2 className="text-sm font-medium">Fontes ({results.sources.length})</h2>
              {sourcesIsFuzzy ? <FuzzyMatchNotice /> : null}
              <SourceSearchResultList hits={results.sources} now={now} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
