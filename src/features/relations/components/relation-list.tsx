import { XIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteRelationAction } from "@/features/relations/actions";
import type { RelationSummary } from "@/features/relations/queries";
import { RELATION_TYPE_META } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

/**
 * One direction of a knowledge record's edges.
 *
 * The same row renders differently depending on which end of it this page is
 * looking from — `outgoing` reads the type's forward label ("depende de"),
 * `incoming` its inverse ("é pré-requisito de") — which is what lets a single
 * stored edge describe both sides without a second row to keep in sync.
 *
 * A Server Component: deleting is a plain form submission to a Server Action,
 * nothing here needs client state.
 */
export function RelationList({
  relations,
  knowledgeId,
  direction,
}: {
  relations: RelationSummary[];
  knowledgeId: string;
  direction: "outgoing" | "incoming";
}) {
  if (relations.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border">
      {relations.map((relation) => {
        const meta = RELATION_TYPE_META[relation.type];
        const label = direction === "outgoing" ? meta.label : meta.inverseLabel;

        return (
          <li key={relation.id} className="bg-card flex items-center gap-3 px-4 py-2.5">
            <Badge variant="outline" className="shrink-0">
              {label}
            </Badge>

            <Link
              href={`${ROUTES.knowledge}/${relation.knowledge.id}`}
              className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
            >
              {relation.knowledge.title}
            </Link>

            {relation.note ? (
              <span className="text-muted-foreground hidden max-w-[16rem] shrink truncate text-xs sm:inline">
                {relation.note}
              </span>
            ) : null}

            <form action={deleteRelationAction}>
              <input type="hidden" name="id" value={relation.id} />
              <input type="hidden" name="knowledgeId" value={knowledgeId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover relação com ${relation.knowledge.title}`}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <XIcon className="size-3.5" />
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
