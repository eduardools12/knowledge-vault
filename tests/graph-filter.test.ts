import { describe, expect, it } from "vitest";

import { filterGraphData, type GraphData } from "@/features/graph/graph-filter";

function node(id: string, areaId?: string): GraphData["nodes"][number] {
  return {
    id,
    title: `Nó ${id}`,
    level: "discovered",
    area: areaId ? { id: areaId, name: `Área ${areaId}`, color: null } : null,
  };
}

function edge(id: string, fromId: string, toId: string): GraphData["edges"][number] {
  return { id, type: "related_to", fromId, toId };
}

/**
 * A --- B --- C --- D, a plain chain, used across most cases below so "how
 * far does depth N reach" has an unambiguous answer.
 */
const CHAIN: GraphData = {
  nodes: [node("a"), node("b"), node("c"), node("d")],
  edges: [edge("ab", "a", "b"), edge("bc", "b", "c"), edge("cd", "c", "d")],
};

describe("filterGraphData", () => {
  it("returns the graph unchanged with no filters", () => {
    expect(filterGraphData(CHAIN, {})).toEqual(CHAIN);
  });

  describe("area filter", () => {
    const data: GraphData = {
      nodes: [node("a", "area-1"), node("b", "area-1"), node("c", "area-2")],
      edges: [edge("ab", "a", "b"), edge("bc", "b", "c")],
    };

    it("keeps only nodes in the given area", () => {
      const result = filterGraphData(data, { area: "area-1" });

      expect(result.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    });

    it("drops an edge once either endpoint falls outside the area", () => {
      const result = filterGraphData(data, { area: "area-1" });

      expect(result.edges.map((e) => e.id)).toEqual(["ab"]);
    });

    it("drops a node with no area when filtering by a specific one", () => {
      const withUnassigned: GraphData = { nodes: [...data.nodes, node("d")], edges: data.edges };

      expect(filterGraphData(withUnassigned, { area: "area-1" }).nodes.map((n) => n.id)).toEqual(["a", "b"]);
    });
  });

  describe("depth from a centre", () => {
    it("keeps only the centre at depth 0... which is not offered, but depth 1 is the closest neighbours", () => {
      const result = filterGraphData(CHAIN, { center: "b", depth: 1 });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    });

    it("reaches further out at a higher depth", () => {
      const result = filterGraphData(CHAIN, { center: "a", depth: 3 });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("does not reach past the given depth", () => {
      const result = filterGraphData(CHAIN, { center: "a", depth: 2 });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    });

    it("treats a relation as undirected for proximity", () => {
      // "d" only has an incoming edge from "c" (cd: from c to d) — still one
      // hop away, because direction describes meaning, not distance.
      const result = filterGraphData(CHAIN, { center: "d", depth: 1 });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["c", "d"]);
    });

    it("defaults to depth 2 when a centre is given without one", () => {
      const withDefault = filterGraphData(CHAIN, { center: "a" });
      const explicit = filterGraphData(CHAIN, { center: "a", depth: 2 });

      expect(withDefault).toEqual(explicit);
    });

    it("only keeps edges between two nodes that both survived", () => {
      const result = filterGraphData(CHAIN, { center: "a", depth: 1 });

      expect(result.edges.map((e) => e.id)).toEqual(["ab"]);
    });

    it("falls back to the full graph when the centre does not exist", () => {
      expect(filterGraphData(CHAIN, { center: "missing", depth: 1 })).toEqual(CHAIN);
    });

    it("falls back to the area-filtered graph when the area filter already excluded the centre", () => {
      const data: GraphData = {
        nodes: [node("a", "area-1"), node("b", "area-2")],
        edges: [edge("ab", "a", "b")],
      };

      // "b" is the centre, but it does not belong to "area-1" — the area
      // filter wins, rather than the page going blank because of a stale
      // `center` left over in the URL.
      const result = filterGraphData(data, { area: "area-1", center: "b", depth: 1 });

      expect(result.nodes.map((n) => n.id)).toEqual(["a"]);
    });

    it("isolates a node with no relations at all", () => {
      const isolated: GraphData = { nodes: [node("solo")], edges: [] };

      expect(filterGraphData(isolated, { center: "solo", depth: 2 }).nodes.map((n) => n.id)).toEqual(["solo"]);
    });
  });
});
