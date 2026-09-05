import "server-only";

import { AnthropicProvider } from "@/lib/ai/anthropic-provider";
import { AiBudgetExceededError } from "@/lib/ai/errors";
import { estimateMaxCost, isPricedModel } from "@/lib/ai/pricing";
import { aiRateLimiter, type RateLimiter } from "@/lib/ai/rate-limit";
import type { AiCompletionRequest, AiCompletionResult, AiProvider } from "@/lib/ai/types";

/**
 * The one function a feature should call to reach an LLM — never a provider
 * class directly, and never `@anthropic-ai/sdk`. See docs/ai.md: this seam is
 * what keeps model access in one place instead of spread across the app, and
 * what makes a rate limit or a cost ceiling something enforced once instead
 * of something every call site has to remember on its own.
 *
 * Callers already did `requireUser()` per the app's three-layer auth — this
 * takes the resolved `userId`, not a session, so it has no auth dependency of
 * its own and stays trivial to call with a fake provider in a test.
 */

/**
 * No call goes out uncapped. This is deliberately conservative for a personal
 * vault's first AI feature (Etapa 10) — raise it per call with
 * `request.maxCostUsd` once a feature's real cost is measured, rather than
 * raising the shared default for everyone.
 */
const DEFAULT_MAX_COST_USD = 0.5;

let defaultProvider: AiProvider | null = null;

function getDefaultProvider(): AiProvider {
  defaultProvider ??= new AnthropicProvider();

  return defaultProvider;
}

export async function completeWithAi(
  userId: string,
  request: AiCompletionRequest,
  options?: { provider?: AiProvider; rateLimiter?: RateLimiter },
): Promise<AiCompletionResult> {
  const rateLimiter = options?.rateLimiter ?? aiRateLimiter;
  rateLimiter.check(userId);

  const provider = options?.provider ?? getDefaultProvider();
  const maxCostUsd = request.maxCostUsd ?? DEFAULT_MAX_COST_USD;

  // A pre-flight ceiling, checked before any network call: cost is a limit,
  // not something only observed after the fact. A model this app has no
  // price for is let through unchecked rather than blocked on a technicality
  // — the real cost, computed from actual usage, is still always returned.
  if (isPricedModel(provider.model)) {
    const inputText = [request.system ?? "", ...request.messages.map((message) => message.content)].join("\n");
    const estimatedMaxCost = estimateMaxCost(provider.model, inputText, request.maxTokens);

    if (estimatedMaxCost > maxCostUsd) {
      throw new AiBudgetExceededError(
        `Esta chamada custaria até ~$${estimatedMaxCost.toFixed(4)}, acima do limite de ` +
          `$${maxCostUsd.toFixed(4)}. Reduza maxTokens ou informe um maxCostUsd maior.`,
      );
    }
  }

  return provider.complete(request);
}
