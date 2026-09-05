import { XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { unlinkProjectKnowledgeAction } from "@/features/projects/actions";
import type { LinkedKnowledgeNote } from "@/features/projects/queries";
import { ROUTES } from "@/lib/routes";

/**
 * The knowledge a project has used, each with its own note on how.
 *
 * A Server Component: unlinking is a plain form submission to a Server
 * Action, nothing here needs client state.
 */
export function ProjectKnowledgeList({
  items,
  projectId,
}: {
  items: LinkedKnowledgeNote[];
  projectId: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {items.map((item) => (
        <li key={item.id} className="bg-card flex items-start gap-3 px-4 py-2.5">
          <div className="grid min-w-0 flex-1 gap-0.5">
            <Link
              href={`${ROUTES.knowledge}/${item.id}`}
              className="truncate text-sm underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>

            {item.note ? <p className="text-muted-foreground text-xs">{item.note}</p> : null}
          </div>

          <form action={unlinkProjectKnowledgeAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="knowledgeId" value={item.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remover ${item.title} deste projeto`}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <XIcon className="size-3.5" />
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
