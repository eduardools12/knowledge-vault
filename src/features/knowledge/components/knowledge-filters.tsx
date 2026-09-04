"use client";

import { SearchIcon, XIcon } from "lucide-react";
import type { ReadonlyURLSearchParams } from "next/navigation";
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
import { KNOWLEDGE_LEVEL_META, KNOWLEDGE_LEVELS, KNOWLEDGE_STATUS_LABELS } from "@/lib/domain";

/** Sentinel for "no filter". A Base UI select item cannot carry an empty value. */
const ANY = "__any__";

/**
 * Base UI resolves the trigger label from `items`, not from the selected
 * `<SelectItem>`'s children — without this map `Select.Value` renders the raw
 * value and the filter reads "__any__".
 */
const LEVEL_ITEMS: Record<string, string> = {
  [ANY]: "Todos os níveis",
  ...Object.fromEntries(KNOWLEDGE_LEVELS.map((level) => [level, KNOWLEDGE_LEVEL_META[level].label])),
};

const STATUS_ITEMS: Record<string, string> = {
  [ANY]: "Ativos",
  ...KNOWLEDGE_STATUS_LABELS,
};

const SEARCH_DEBOUNCE_MS = 300;

type FilterChanges = Record<string, string | undefined>;

/**
 * Builds the next URL from the current one.
 *
 * Pure and defined outside the component so the debounce effect can call it
 * without taking a function that is re-created on every render as a dependency.
 */
function buildFilterHref(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  changes: FilterChanges,
): string {
  const params = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(changes)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  // Any filter change invalidates the page number: page 3 of the old result set
  // is usually empty in the new one.
  params.delete("page");

  const search = params.toString();

  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Search and filters for the knowledge list.
 *
 * State lives in the URL rather than in the component: the filtered view is
 * then shareable, survives a reload, and works with the back button. It also
 * keeps the list itself a Server Component — the filters navigate, and the
 * server re-queries.
 */
export function KnowledgeFilters({
  defaultQuery,
  defaultLevel,
  defaultStatus,
}: {
  defaultQuery?: string;
  defaultLevel?: string;
  defaultStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(defaultQuery ?? "");

  function navigate(changes: FilterChanges) {
    // `replace`, not `push`: typing four letters should not leave four entries
    // for the back button to walk through.
    startTransition(() =>
      router.replace(buildFilterHref(pathname, searchParams, changes), { scroll: false }),
    );
  }

  // Debounced search. The effect re-runs on every keystroke and its cleanup
  // clears the pending timer, so the navigation happens once the typing stops —
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

  const hasFilters = Boolean(query || defaultLevel || defaultStatus);

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
          placeholder="Buscar por título, resumo ou conteúdo…"
          aria-label="Buscar conhecimentos"
          className="pl-8"
        />
      </div>

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

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            navigate({ q: undefined, level: undefined, status: undefined });
          }}
        >
          <XIcon className="size-4" aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
