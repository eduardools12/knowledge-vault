import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SOURCE_TYPE_LABELS, type SourceType } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

export type PickableSource = { id: string; title: string; type: SourceType };

/**
 * Source selection as a group of native checkboxes.
 *
 * Mirrors `TagPicker`: a checkbox group submits with the form as repeated
 * values, is keyboard-usable and announced correctly with no ARIA of our own,
 * and works before hydration. A personal vault has dozens of sources, not
 * thousands, so the list fits in a scrollable box without needing a combobox.
 *
 * A Server Component: nothing here needs client state, since the checkboxes
 * hold their own.
 */
export function SourcePicker({
  name,
  sources,
  selectedIds = [],
}: {
  name: string;
  sources: PickableSource[];
  selectedIds?: string[];
}) {
  if (sources.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Nenhuma fonte cadastrada ainda.{" "}
        <Link href={ROUTES.sources} className="text-foreground underline underline-offset-4">
          Criar fontes
        </Link>
      </p>
    );
  }

  const selected = new Set(selectedIds);

  return (
    <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2">
      {sources.map((source) => (
        <label
          key={source.id}
          className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
        >
          <input
            type="checkbox"
            name={name}
            value={source.id}
            defaultChecked={selected.has(source.id)}
            className="accent-primary size-4 shrink-0"
          />
          <span className="min-w-0 flex-1 truncate">{source.title}</span>
          <Badge variant="outline" className="shrink-0">
            {SOURCE_TYPE_LABELS[source.type]}
          </Badge>
        </label>
      ))}
    </div>
  );
}
