"use client";

import { XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_GRAPH_DEPTH } from "@/features/graph/graph-filter";
import { buildFilterHref, type FilterChanges } from "@/lib/filter-href";

/** Sentinel for "no filter". A Base UI select item cannot carry an empty value. */
const ANY = "__any__";

const DEPTH_ITEMS: Record<string, string> = {
  "1": "1 nível",
  "2": "2 níveis",
  "3": "3 níveis",
};

/**
 * Área narrows which knowledge is even in the graph. Profundidade only
 * appears once something is centred — clicking a node in `KnowledgeGraph`,
 * not a field here — since "how many hops out" means nothing without a node
 * to count hops from.
 */
export function GraphFilters({
  defaultArea,
  defaultCenter,
  defaultDepth,
  centerTitle,
  areas,
}: {
  defaultArea?: string;
  defaultCenter?: string;
  defaultDepth?: number;
  /** The centred node's own title, so the hint reads as a name, not a raw id. */
  centerTitle?: string;
  areas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const areaItems: Record<string, string> = {
    [ANY]: "Todas as áreas",
    ...Object.fromEntries(areas.map((area) => [area.id, area.name])),
  };

  function navigate(changes: FilterChanges) {
    startTransition(() =>
      router.replace(buildFilterHref(pathname, searchParams, changes), { scroll: false }),
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3" data-pending={isPending || undefined}>
      <Select
        items={areaItems}
        value={defaultArea ?? ANY}
        onValueChange={(value) => navigate({ area: value === ANY ? undefined : String(value) })}
      >
        <SelectTrigger className="w-48" aria-label="Filtrar por área">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(areaItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {defaultCenter ? (
        <>
          <Select
            items={DEPTH_ITEMS}
            value={String(defaultDepth ?? DEFAULT_GRAPH_DEPTH)}
            onValueChange={(value) => navigate({ depth: String(value) })}
          >
            <SelectTrigger className="w-36" aria-label="Profundidade a partir do foco">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DEPTH_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground text-sm">
            Foco: <span className="text-foreground font-medium">{centerTitle ?? "conhecimento removido"}</span>
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate({ center: undefined, depth: undefined })}
          >
            <XIcon className="size-4" aria-hidden="true" />
            Limpar foco
          </Button>
        </>
      ) : null}
    </div>
  );
}
