import "server-only";

import { getKnowledgeById } from "@/features/knowledge/queries";
import { listRelationsForKnowledge } from "@/features/relations/queries";
import {
  buildRagPrompt,
  NOTHING_FOUND_RESULT,
  ragAnswerSchema,
  selectContextCandidates,
  toOfferedResult,
  type RagCandidate,
  type RagResult,
} from "@/features/search/rag-prompt";
import { search } from "@/features/search/queries";
import type { SearchFilters } from "@/features/search/schemas";
import { getSourceById } from "@/features/sources/queries";
import { completeStructuredWithAi } from "@/lib/ai/client";

/**
 * The RAG pipeline docs/ai.md describes, one step per piece of this file:
 *
 *   1. Busca híbrida recupera candidatos      → `search()`, reused as-is
 *   2. Expansão pelo grafo                    → `listRelationsForKnowledge`
 *   3. Monta o contexto no limite de tokens    → `selectContextCandidates`
 *   4. Consulta o modelo                       → `completeStructuredWithAi`
 *   5. Responde citando o que usou              → `toOfferedResult`
 *
 * Not independently unit-tested — a thin orchestrator over a real Supabase
 * client and the AI client, same as `features/inbox/ai-suggestion.ts`. What
 * is tested is what it delegates to: `rag-prompt.ts`'s pure functions, and
 * `search()`'s own tests from Etapa 8/11.
 */

/** Top hits handed to the model as seeds, before graph expansion. */
const SEED_KNOWLEDGE_LIMIT = 5;
const SEED_SOURCE_LIMIT = 3;

/** Only the very top hits are worth spending a relations lookup on. */
const GRAPH_EXPANSION_SEED_LIMIT = 3;
const MAX_NEIGHBORS = 4;

/** Input budget for the context, independent of `completeStructuredWithAi`'s own cost ceiling. */
const MAX_CONTEXT_TOKENS = 6000;
const MAX_ANSWER_TOKENS = 1024;

export async function answerFromVault(userId: string, filters: SearchFilters): Promise<RagResult> {
  const question = filters.q?.trim();

  if (!question) {
    return NOTHING_FOUND_RESULT;
  }

  const results = await search(filters);
  const seedKnowledge = results.knowledge.slice(0, SEED_KNOWLEDGE_LIMIT);
  const seedSources = results.sources.slice(0, SEED_SOURCE_LIMIT);

  if (seedKnowledge.length === 0 && seedSources.length === 0) {
    return NOTHING_FOUND_RESULT;
  }

  // Step 2: pull in graph neighbours of the top knowledge hits. A vizinho de
  // grafo is curated by the user, not ranked by a model — docs/ai.md's reason
  // for expanding this way instead of just taking the sixth search hit.
  const seedIds = new Set(seedKnowledge.map((hit) => hit.id));
  const neighborIds = new Set<string>();

  for (const hit of seedKnowledge.slice(0, GRAPH_EXPANSION_SEED_LIMIT)) {
    if (neighborIds.size >= MAX_NEIGHBORS) {
      break;
    }

    const relations = await listRelationsForKnowledge(hit.id);

    for (const relation of [...relations.outgoing, ...relations.incoming]) {
      if (neighborIds.size >= MAX_NEIGHBORS) {
        break;
      }

      if (!seedIds.has(relation.knowledge.id)) {
        neighborIds.add(relation.knowledge.id);
      }
    }
  }

  const [seedKnowledgeDetails, neighborDetails, sourceDetails] = await Promise.all([
    Promise.all(seedKnowledge.map((hit) => getKnowledgeById(hit.id))),
    Promise.all([...neighborIds].map((id) => getKnowledgeById(id))),
    Promise.all(seedSources.map((hit) => getSourceById(hit.id))),
  ]);

  const knowledgeCandidates: RagCandidate[] = [...seedKnowledgeDetails, ...neighborDetails]
    .filter((knowledge): knowledge is NonNullable<typeof knowledge> => knowledge !== null)
    .map((knowledge) => ({
      type: "knowledge",
      id: knowledge.id,
      title: knowledge.title,
      secondary: knowledge.summary,
      body: knowledge.contentText,
    }));

  const sourceCandidates: RagCandidate[] = sourceDetails
    .filter((source): source is NonNullable<typeof source> => source !== null)
    .map((source) => ({
      type: "source",
      id: source.id,
      title: source.title,
      secondary: source.description,
      body: source.content ?? "",
    }));

  // Step 3: seeds first, then graph neighbours — the priority order
  // `selectContextCandidates` trims from the back of when the budget is short.
  const contextCandidates = selectContextCandidates(
    [...knowledgeCandidates, ...sourceCandidates],
    MAX_CONTEXT_TOKENS,
  );

  if (contextCandidates.length === 0) {
    return NOTHING_FOUND_RESULT;
  }

  // Step 4.
  const { system, user } = buildRagPrompt(question, contextCandidates);
  const result = await completeStructuredWithAi(userId, {
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: MAX_ANSWER_TOKENS,
    schema: ragAnswerSchema,
  });

  // Step 5.
  return toOfferedResult(result.data, contextCandidates);
}
