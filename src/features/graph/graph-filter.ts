import type { KnowledgeLevel, RelationType } from "@/lib/domain";

/**
 * The pure half of the graph view — narrowing the full graph down to what
 * gets rendered. Kept apart from `queries.ts` (which needs a Supabase client)
 * so it can be unit tested directly, same split as everywhere else in this
 * codebase that mixes a database read with logic worth testing on its own.
 */

export type GraphKnowledgeNode = {
  id: string;
  title: string;
  level: KnowledgeLevel;
  area: { id: string; name: string; color: string | null } | null;
};

export type GraphRelationEdge = {
  id: string;
  type: RelationType;
  fromId: string;
  toId: string;
};

export type GraphData = {
  nodes: GraphKnowledgeNode[];
  edges: GraphRelationEdge[];
};

export type GraphViewFilters = {
  area?: string;
  /** A knowledge id to centre the view on — set by clicking a node, not a form field. */
  center?: string;
  depth?: number;
};

/** Applied when a centre is chosen but no depth was, in both the filter and the control offering it. */
export const DEFAULT_GRAPH_DEPTH = 2;

/**
 * Narrows the full graph to what `/grafo` actually renders: filtered by area
 * first, then — if a centre survived that filter — limited to whatever is
 * within `depth` hops of it.
 *
 * Pure and synchronous: the graphs this app targets (one person's vault, not
 * a shared corpus) fit comfortably in memory, so there is no reason to push
 * this into SQL the way `search_knowledge` had to for ranking.
 */
export function filterGraphData(data: GraphData, filters: GraphViewFilters): GraphData {
  const areaFiltered: GraphData = filters.area
    ? { nodes: data.nodes.filter((node) => node.area?.id === filters.area), edges: data.edges }
    : data;

  const areaNodeIds = new Set(areaFiltered.nodes.map((node) => node.id));
  const scoped: GraphData = {
    nodes: areaFiltered.nodes,
    edges: areaFiltered.edges.filter((edge) => areaNodeIds.has(edge.fromId) && areaNodeIds.has(edge.toId)),
  };

  // No centre, or one the area filter already excluded: nothing left to
  // narrow. Falling back to the area-filtered graph rather than an empty one
  // — a stale `center` left over in the URL should not blank the whole page.
  if (!filters.center || !areaNodeIds.has(filters.center)) {
    return scoped;
  }

  const reachable = reachableWithinDepth(scoped, filters.center, filters.depth ?? DEFAULT_GRAPH_DEPTH);

  return {
    nodes: scoped.nodes.filter((node) => reachable.has(node.id)),
    edges: scoped.edges.filter((edge) => reachable.has(edge.fromId) && reachable.has(edge.toId)),
  };
}

function buildAdjacency(edges: GraphRelationEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  function addNeighbor(from: string, to: string) {
    const neighbors = adjacency.get(from);

    if (neighbors) {
      neighbors.push(to);
    } else {
      adjacency.set(from, [to]);
    }
  }

  for (const edge of edges) {
    addNeighbor(edge.fromId, edge.toId);
    addNeighbor(edge.toId, edge.fromId);
  }

  return adjacency;
}

/**
 * Breadth-first, undirected: for "what's near this node", the direction of a
 * `depends_on` edge does not matter, only that it connects the two records.
 */
function reachableWithinDepth(data: GraphData, centerId: string, depth: number): Set<string> {
  const adjacency = buildAdjacency(data.edges);
  const visited = new Set([centerId]);
  let frontier = [centerId];

  for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
    const next: string[] = [];

    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }

    frontier = next;
  }

  return visited;
}
