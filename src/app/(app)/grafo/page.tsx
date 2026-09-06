import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { GraphFilters } from "@/features/graph/components/graph-filters";
import { KnowledgeGraph } from "@/features/graph/components/knowledge-graph";
import { filterGraphData } from "@/features/graph/graph-filter";
import { listGraphData } from "@/features/graph/queries";
import { graphFiltersSchema } from "@/features/graph/schemas";

export const metadata: Metadata = {
  title: "Grafo",
};

export default async function GrafoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // `.catch(undefined)` per field: a stale or hand-edited URL degrades to no
  // filter instead of an error page — same convention as every other filtered
  // list in the app.
  const filters = graphFiltersSchema.parse(raw);

  const [areas, data] = await Promise.all([listAreas(), listGraphData()]);
  const areaOptions = flattenAreaTree(buildAreaTree(areas)).map((area) => ({
    id: area.id,
    name: area.name,
  }));

  const visible = filterGraphData(data, filters);
  const isFiltered = Boolean(filters.area || filters.center);
  const centerTitle = filters.center ? data.nodes.find((node) => node.id === filters.center)?.title : undefined;

  return (
    <>
      <PageHeader
        title="Grafo"
        description="O acervo visto como rede: clique num nó para focar na vizinhança, duplo clique para abrir."
      />

      <GraphFilters
        defaultArea={filters.area}
        defaultCenter={filters.center}
        defaultDepth={filters.depth}
        centerTitle={centerTitle}
        areas={areaOptions}
      />

      <KnowledgeGraph data={visible} isFiltered={isFiltered} />
    </>
  );
}
