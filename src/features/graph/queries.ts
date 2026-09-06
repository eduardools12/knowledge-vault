import "server-only";

import type { GraphData } from "@/features/graph/graph-filter";
import { requireUser } from "@/lib/auth/dal";
import type { KnowledgeLevel, RelationType } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads for the knowledge graph (Etapa 13): every knowledge record as a node,
 * every relation as an edge. No filtering here — `filterGraphData`
 * (`graph-filter.ts`) does that, in memory, once — a personal vault's graph
 * is small enough that this is simpler and cheaper than re-querying per
 * filter change.
 */

type KnowledgeNodeRow = {
  id: string;
  title: string;
  level: KnowledgeLevel;
  area: { id: string; name: string; color: string | null } | null;
};

type RelationEdgeRow = {
  id: string;
  type: RelationType;
  from_id: string;
  to_id: string;
};

export async function listGraphData(): Promise<GraphData> {
  await requireUser();

  const supabase = await createSupabaseServerClient();

  const [nodesRes, edgesRes] = await Promise.all([
    // Archived records are hidden everywhere else by default (the list page,
    // the dashboard); the graph follows the same convention rather than
    // surfacing a "not now" as if it were still part of the active vault.
    supabase
      .from("knowledge")
      .select("id, title, level, area:areas!knowledge_area_fk(id, name, color)")
      .neq("status", "archived"),
    supabase.from("knowledge_relations").select("id, type, from_id, to_id"),
  ]);

  if (nodesRes.error) {
    console.error("[graph] nodes failed:", nodesRes.error.message);
  }

  if (edgesRes.error) {
    console.error("[graph] edges failed:", edgesRes.error.message);
  }

  const nodeRows = (nodesRes.data ?? []) as KnowledgeNodeRow[];
  const edgeRows = (edgesRes.data ?? []) as RelationEdgeRow[];

  // An edge whose knowledge is archived (and so excluded above) would
  // otherwise point at a node the graph never renders.
  const nodeIds = new Set(nodeRows.map((row) => row.id));

  return {
    nodes: nodeRows.map((row) => ({
      id: row.id,
      title: row.title,
      level: row.level,
      area: row.area,
    })),
    edges: edgeRows
      .filter((row) => nodeIds.has(row.from_id) && nodeIds.has(row.to_id))
      .map((row) => ({
        id: row.id,
        type: row.type,
        fromId: row.from_id,
        toId: row.to_id,
      })),
  };
}
