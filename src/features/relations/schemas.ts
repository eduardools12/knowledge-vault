import { z } from "zod";

import { RELATION_TYPES } from "@/lib/domain";

/**
 * Validation for adding a relation between two knowledge records.
 *
 * `direction` decides which end the current record occupies — `from` means
 * this record is the subject of `type` ("este depende de outro"), `to` means
 * it is the object ("outro depende deste"). Storing that choice as a field
 * rather than always writing `from = current` is what lets one page express
 * both directions of every relation type without visiting the other record.
 */
export const RELATION_DIRECTIONS = ["from", "to"] as const;
export type RelationDirection = (typeof RELATION_DIRECTIONS)[number];

export const relationFormSchema = z.object({
  targetId: z.uuid({ error: "Selecione um conhecimento." }),
  type: z.enum(RELATION_TYPES, { error: "Selecione um tipo de relação." }),
  direction: z.enum(RELATION_DIRECTIONS, { error: "Selecione uma direção." }),
  note: z
    .string()
    .trim()
    .max(1000, { error: "A nota deve ter no máximo 1000 caracteres." })
    .transform((value) => value || null),
});

export type RelationFormInput = z.infer<typeof relationFormSchema>;

/**
 * Which id becomes `from_id` and which becomes `to_id`.
 *
 * Pulled out on its own because getting `direction` backwards is exactly the
 * kind of mistake that does not crash — it just stores every relation with
 * the two ends swapped, silently, until someone notices "depende de" reading
 * backwards on a page.
 */
export function resolveRelationEndpoints(
  knowledgeId: string,
  targetId: string,
  direction: RelationDirection,
): { fromId: string; toId: string } {
  return direction === "from"
    ? { fromId: knowledgeId, toId: targetId }
    : { fromId: targetId, toId: knowledgeId };
}
