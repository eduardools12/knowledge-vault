"use client";

import { NetworkIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { GraphData } from "@/features/graph/graph-filter";
import { buildFilterHref } from "@/lib/filter-href";
import { ROUTES } from "@/lib/routes";

/**
 * `ssr: false` is load-bearing, not a nicety: `reagraph` renders through
 * Three.js, which has no server-side story at all. Without this, the page
 * would fail to render on the server rather than merely showing a
 * placeholder until the client takes over.
 */
const GraphCanvasInner = dynamic(
  () => import("@/features/graph/components/graph-canvas-inner").then((mod) => mod.GraphCanvasInner),
  { ssr: false, loading: () => <Skeleton className="h-[70vh] w-full" /> },
);

/**
 * Owns the one piece of interaction the canvas itself cannot: turning a
 * click into a URL change. A single click sets `center` (narrows the view to
 * that node's neighbourhood, via `filterGraphData` on the next render); a
 * double click navigates straight to the record, same "click to focus,
 * double-click to open" split a file explorer uses.
 */
export function KnowledgeGraph({ data, isFiltered }: { data: GraphData; isFiltered: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (data.nodes.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={NetworkIcon}
        title="Nada com esse filtro"
        description="Remova o filtro de área ou limpe o foco para ver mais do grafo."
      />
    ) : (
      <EmptyState
        icon={NetworkIcon}
        title="Nada para mostrar ainda"
        description="Crie conhecimentos e relacione-os entre si para ver o grafo tomar forma."
      />
    );
  }

  return (
    // `relative`, not just a height, is load-bearing: the canvas `reagraph`
    // renders through `@react-three/fiber` sizes itself to `100%` of its
    // nearest positioned ancestor. Without `relative` here, that resolves
    // against the viewport instead and the canvas covers the whole page.
    <div className="relative h-[70vh] w-full overflow-hidden rounded-lg border">
      <GraphCanvasInner
        data={data}
        onSelect={(id) =>
          router.replace(buildFilterHref(pathname, searchParams, { center: id }), { scroll: false })
        }
        onOpen={(id) => router.push(`${ROUTES.knowledge}/${id}`)}
      />
    </div>
  );
}
