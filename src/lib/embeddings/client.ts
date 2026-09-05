import "server-only";

import { EmbeddingBudgetExceededError } from "@/lib/embeddings/errors";
import { OpenAiEmbeddingProvider } from "@/lib/embeddings/openai-provider";
import { estimateMaxCost, isPricedEmbeddingModel } from "@/lib/embeddings/pricing";
import { embeddingRateLimiter, type RateLimiter } from "@/lib/embeddings/rate-limit";
import type { EmbedRequest, EmbedResult, EmbeddingProvider } from "@/lib/embeddings/types";

/**
 * The one function a feature should call to turn text into vectors — never a
 * provider class directly, and never `openai`. Same seam as
 * `src/lib/ai/client.ts`, and for the same reason: a rate limit or a cost
 * ceiling enforced here is enforced once, not something every call site (the
 * indexing worker, hybrid search) has to remember on its own.
 *
 * Callers already resolved a `userId` — a job's own `user_id` column for the
 * worker, `requireUser()`'s result for a live search — so this module has no
 * auth dependency of its own.
 */

const DEFAULT_MAX_COST_USD = 0.05;

let defaultProvider: EmbeddingProvider | null = null;

function getDefaultProvider(): EmbeddingProvider {
  defaultProvider ??= new OpenAiEmbeddingProvider();

  return defaultProvider;
}

export async function embedTexts(
  userId: string,
  request: EmbedRequest,
  options?: { provider?: EmbeddingProvider; rateLimiter?: RateLimiter },
): Promise<EmbedResult> {
  const rateLimiter = options?.rateLimiter ?? embeddingRateLimiter;
  rateLimiter.check(userId);

  const provider = options?.provider ?? getDefaultProvider();
  const maxCostUsd = request.maxCostUsd ?? DEFAULT_MAX_COST_USD;

  // A pre-flight ceiling, checked before any network call — same principle as
  // `completeWithAi`'s: cost is a limit, not something only observed after
  // the fact. An indexing job embeds however many chunks one record produced
  // in a single batched call, so this is what stands between a pasted huge
  // document and an unbounded bill, not a per-request nicety.
  if (isPricedEmbeddingModel(provider.model)) {
    const estimatedMaxCost = estimateMaxCost(provider.model, request.texts);

    if (estimatedMaxCost > maxCostUsd) {
      throw new EmbeddingBudgetExceededError(
        `Este lote custaria até ~$${estimatedMaxCost.toFixed(4)}, acima do limite de ` +
          `$${maxCostUsd.toFixed(4)}. Reduza o lote ou informe um maxCostUsd maior.`,
      );
    }
  }

  return provider.embed(request);
}
