"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_TYPE_LABELS, SOURCE_TYPES } from "@/lib/domain";
import { buildFilterHref } from "@/lib/filter-href";

/** Sentinel for "no filter". A Base UI select item cannot carry an empty value. */
const ANY = "__any__";

/** Base UI reads the trigger label from `items`, not from the selected child. */
const TYPE_ITEMS: Record<string, string> = {
  [ANY]: "Todos os tipos",
  ...Object.fromEntries(SOURCE_TYPES.map((type) => [type, SOURCE_TYPE_LABELS[type]])),
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search and type filter for the sources list.
 *
 * Same shape as `KnowledgeFilters`: state lives in the URL, so the filtered
 * view is shareable and survives a reload, and the list itself stays a Server
 * Component.
 */
export function SourceFilters({
  defaultQuery,
  defaultType,
}: {
  defaultQuery?: string;
  defaultType?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(defaultQuery ?? "");

  useEffect(() => {
    if ((defaultQuery ?? "") === query) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() =>
        router.replace(buildFilterHref(pathname, searchParams, { q: query || undefined }), {
          scroll: false,
        }),
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, defaultQuery, pathname, router, searchParams]);

  const hasFilters = Boolean(query || defaultType);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3" data-pending={isPending || undefined}>
      <div className="relative min-w-56 flex-1">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título, autor ou conteúdo…"
          aria-label="Buscar fontes"
          className="pl-8"
        />
      </div>

      <Select
        items={TYPE_ITEMS}
        value={defaultType ?? ANY}
        onValueChange={(value) =>
          startTransition(() =>
            router.replace(
              buildFilterHref(pathname, searchParams, {
                type: value === ANY ? undefined : String(value),
              }),
              { scroll: false },
            ),
          )
        }
      >
        <SelectTrigger className="w-44" aria-label="Filtrar por tipo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TYPE_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            startTransition(() =>
              router.replace(buildFilterHref(pathname, searchParams, { q: undefined, type: undefined }), {
                scroll: false,
              }),
            );
          }}
        >
          <XIcon className="size-4" aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
