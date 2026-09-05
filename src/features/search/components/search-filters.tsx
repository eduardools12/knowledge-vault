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
import {
  KNOWLEDGE_LEVEL_META,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPES,
} from "@/lib/domain";
import { buildFilterHref, type FilterChanges } from "@/lib/filter-href";

/** Sentinel for "no filter". A Base UI select item cannot carry an empty value. */
const ANY = "__any__";

const LEVEL_ITEMS: Record<string, string> = {
  [ANY]: "Todos os níveis",
  ...Object.fromEntries(KNOWLEDGE_LEVELS.map((level) => [level, KNOWLEDGE_LEVEL_META[level].label])),
};

const STATUS_ITEMS: Record<string, string> = {
  [ANY]: "Qualquer status",
  ...KNOWLEDGE_STATUS_LABELS,
};

const SOURCE_TYPE_ITEMS: Record<string, string> = {
  [ANY]: "Qualquer tipo de fonte",
  ...Object.fromEntries(SOURCE_TYPES.map((type) => [type, SOURCE_TYPE_LABELS[type]])),
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The search box plus every combinable filter: área, tag and nível/status
 * narrow the knowledge results, tipo narrows the sources, and tag applies to
 * both. State lives in the URL, same as every other list filter in the app —
 * shareable, survives a reload, and keeps the results themselves server-
 * rendered.
 */
export function SearchFilters({
  defaultQuery,
  defaultArea,
  defaultTag,
  defaultLevel,
  defaultStatus,
  defaultSourceType,
  areas,
  tags,
}: {
  defaultQuery?: string;
  defaultArea?: string;
  defaultTag?: string;
  defaultLevel?: string;
  defaultStatus?: string;
  defaultSourceType?: string;
  areas: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(defaultQuery ?? "");

  const areaItems: Record<string, string> = {
    [ANY]: "Todas as áreas",
    ...Object.fromEntries(areas.map((area) => [area.id, area.name])),
  };

  const tagItems: Record<string, string> = {
    [ANY]: "Todas as tags",
    ...Object.fromEntries(tags.map((tag) => [tag.id, tag.name])),
  };

  function navigate(changes: FilterChanges) {
    // `replace`, not `push`: picking three filters in a row should not leave
    // three entries for the back button to walk through.
    startTransition(() =>
      router.replace(buildFilterHref(pathname, searchParams, changes), { scroll: false }),
    );
  }

  // Debounced search. The effect re-runs on every keystroke and its cleanup
  // clears the pending timer, so the navigation happens once typing stops —
  // that restart *is* the debounce, not something to work around.
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

  const hasFilters = Boolean(
    query || defaultArea || defaultTag || defaultLevel || defaultStatus || defaultSourceType,
  );

  return (
    <div className="mb-6 grid gap-3" data-pending={isPending || undefined}>
      <div className="relative">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar em conhecimentos e fontes…"
          aria-label="Buscar"
          autoFocus
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {areas.length > 0 ? (
          <Select
            items={areaItems}
            value={defaultArea ?? ANY}
            onValueChange={(value) => navigate({ area: value === ANY ? undefined : String(value) })}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por área">
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
        ) : null}

        {tags.length > 0 ? (
          <Select
            items={tagItems}
            value={defaultTag ?? ANY}
            onValueChange={(value) => navigate({ tag: value === ANY ? undefined : String(value) })}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por tag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tagItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          items={LEVEL_ITEMS}
          value={defaultLevel ?? ANY}
          onValueChange={(value) => navigate({ level: value === ANY ? undefined : String(value) })}
        >
          <SelectTrigger className="w-40" aria-label="Filtrar por nível">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LEVEL_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={STATUS_ITEMS}
          value={defaultStatus ?? ANY}
          onValueChange={(value) => navigate({ status: value === ANY ? undefined : String(value) })}
        >
          <SelectTrigger className="w-40" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={SOURCE_TYPE_ITEMS}
          value={defaultSourceType ?? ANY}
          onValueChange={(value) => navigate({ sourceType: value === ANY ? undefined : String(value) })}
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por tipo de fonte">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCE_TYPE_ITEMS).map(([value, label]) => (
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
              navigate({
                q: undefined,
                area: undefined,
                tag: undefined,
                level: undefined,
                status: undefined,
                sourceType: undefined,
              });
            }}
          >
            <XIcon className="size-4" aria-hidden="true" />
            Limpar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
