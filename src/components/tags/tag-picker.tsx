import Link from "next/link";

import { TagBadge } from "@/components/tags/tag-badge";
import { ROUTES } from "@/lib/routes";

export type PickableTag = { id: string; name: string; color: string | null };

/**
 * Tag selection as a group of native checkboxes.
 *
 * A checkbox group rather than a combobox: it submits with the form as repeated
 * values, it is keyboard-usable and announced correctly with no ARIA of our
 * own, and it works before hydration. A personal vault has tens of tags, not
 * thousands, so the list fits on screen — a combobox would be more machinery
 * for a problem this does not have.
 *
 * A Server Component: nothing here needs client state, since the checkboxes
 * hold their own.
 */
export function TagPicker({
  name,
  tags,
  selectedIds = [],
}: {
  name: string;
  tags: PickableTag[];
  selectedIds?: string[];
}) {
  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        Nenhuma tag criada ainda.{" "}
        <Link href={ROUTES.tags} className="text-foreground underline underline-offset-4">
          Criar tags
        </Link>
      </p>
    );
  }

  const selected = new Set(selectedIds);

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {tags.map((tag) => (
          <label key={tag.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={tag.id}
              defaultChecked={selected.has(tag.id)}
              className="accent-primary size-4 shrink-0"
            />
            <TagBadge name={tag.name} color={tag.color} />
          </label>
        ))}
      </div>
    </div>
  );
}
