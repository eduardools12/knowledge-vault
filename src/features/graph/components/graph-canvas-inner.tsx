"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  darkTheme,
  GraphCanvas,
  lightTheme,
  type GraphEdge as ReagraphEdge,
  type GraphNode as ReagraphNode,
} from "reagraph";

import type { GraphData } from "@/features/graph/graph-filter";
import { RELATION_TYPE_META } from "@/lib/domain";
import { DEFAULT_COLOR, isPaletteColor } from "@/lib/palette";

/**
 * The actual WebGL canvas (`reagraph` renders through `@react-three/fiber`,
 * `three` underneath). Never imported directly — `KnowledgeGraph` loads it
 * via `next/dynamic({ ssr: false })`, because a Three.js scene has no
 * server-side rendering story at all, unlike the rest of this app's pages.
 *
 * Deliberately dumb: no URL, no routing. `onSelect` / `onOpen` are plain
 * callbacks so this file's only job is turning `GraphData` into what
 * `reagraph` expects and back.
 */
export function GraphCanvasInner({
  data,
  onSelect,
  onOpen,
}: {
  data: GraphData;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  // `resolvedTheme` rather than `theme`: "system" is not a theme `reagraph`
  // understands, and this component only ever mounts client-side (via the
  // `ssr: false` boundary above), so there is no hydration mismatch to guard
  // against by waiting an extra render.
  const { resolvedTheme } = useTheme();

  const nodes = useMemo<ReagraphNode[]>(
    () =>
      data.nodes.map((node) => ({
        id: node.id,
        label: node.title,
        fill: isPaletteColor(node.area?.color) ? node.area.color : DEFAULT_COLOR,
      })),
    [data.nodes],
  );

  const edges = useMemo<ReagraphEdge[]>(
    () =>
      data.edges.map((edge) => ({
        id: edge.id,
        source: edge.fromId,
        target: edge.toId,
        label: RELATION_TYPE_META[edge.type].label,
      })),
    [data.edges],
  );

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      theme={resolvedTheme === "dark" ? darkTheme : lightTheme}
      layoutType="forceDirected2d"
      // Nodes with more relations render larger — a busier record is
      // usually a more central one, and this is the one visual cue that
      // costs nothing extra to compute (reagraph derives it from the edges
      // it already has).
      sizingType="centrality"
      onNodeClick={(node) => onSelect(node.id)}
      onNodeDoubleClick={(node) => onOpen(node.id)}
    />
  );
}
