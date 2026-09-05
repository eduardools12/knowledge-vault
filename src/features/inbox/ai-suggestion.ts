import "server-only";

import {
  buildSuggestionPrompt,
  keepOnlyOfferedIds,
  suggestionSchema,
  type AreaOption,
  type KnowledgeSuggestion,
  type TagOption,
} from "@/features/inbox/ai-suggestion-prompt";
import type { InboxItemDetail } from "@/features/inbox/queries";
import { completeStructuredWithAi } from "@/lib/ai/client";

/**
 * Turning an inbox capture into a suggested knowledge record.
 *
 * Follows docs/ai.md's rule to the letter: this module only ever *proposes* —
 * it has no access to anything that writes to `knowledge`, and its result is
 * plain data the caller hands to a form the user still has to review and
 * submit themselves. "IA sugere; o usuário decide."
 */
export async function suggestKnowledgeFromInboxItem(
  userId: string,
  item: InboxItemDetail,
  areas: AreaOption[],
  tags: TagOption[],
): Promise<KnowledgeSuggestion> {
  const { system, sourceText } = buildSuggestionPrompt(item, areas, tags);

  const result = await completeStructuredWithAi(userId, {
    system,
    messages: [{ role: "user", content: sourceText }],
    maxTokens: 1024,
    schema: suggestionSchema,
  });

  return keepOnlyOfferedIds(result.data, areas, tags);
}
