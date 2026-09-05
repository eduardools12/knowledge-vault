import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { AiConfigError, AiProviderError, AiRateLimitError } from "@/lib/ai/errors";
import { costForUsage, isPricedModel } from "@/lib/ai/pricing";
import type { AiCompletionRequest, AiCompletionResult, AiProvider } from "@/lib/ai/types";
import { getServerEnv } from "@/lib/env";

/**
 * The only file in the app that imports `@anthropic-ai/sdk`.
 *
 * A second provider — a different vendor, or a locally-hosted model — is a
 * second file implementing `AiProvider`, never a change to this one or to
 * whatever calls `client.ts`. That is the entire point of the interface in
 * `types.ts`, and the reason docs/ai.md insists on it: the app must be able
 * to change what answers its LLM calls without rewriting the calls
 * themselves.
 */

const DEFAULT_MODEL = "claude-opus-5";

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) {
    return cachedClient;
  }

  const { ANTHROPIC_API_KEY } = getServerEnv();

  if (!ANTHROPIC_API_KEY) {
    throw new AiConfigError(
      "ANTHROPIC_API_KEY não está configurada. Defina-a em .env.local para usar recursos de IA.",
    );
  }

  cachedClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  return cachedClient;
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const client = getClient();

    let response;

    try {
      response = await client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
      });
    } catch (error) {
      throw translateError(error);
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };

    return {
      text,
      model: response.model,
      usage,
      // Falls back to 0 rather than throwing: a model this app does not have
      // a price for yet should not make an otherwise-successful call fail —
      // it should just be missing from whatever adds these numbers up later.
      costUsd: isPricedModel(response.model) ? costForUsage(response.model, usage) : 0,
    };
  }
}

/**
 * Maps the SDK's own exception types to ours, most specific first — the same
 * chain docs/claude-api recommends, so a caller here never needs to know
 * which SDK is behind `AiProvider`.
 */
function translateError(error: unknown): Error {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiConfigError("A chave de API da Anthropic foi rejeitada. Verifique ANTHROPIC_API_KEY.", {
      cause: error,
    });
  }

  if (error instanceof Anthropic.RateLimitError) {
    return new AiRateLimitError(
      "O provedor de IA recusou a chamada por limite de taxa. Tente novamente em instantes.",
      { cause: error },
    );
  }

  if (error instanceof Anthropic.APIError) {
    return new AiProviderError(`Falha no provedor de IA (${error.status}): ${error.message}`, { cause: error });
  }

  return new AiProviderError("Falha inesperada ao chamar o provedor de IA.", { cause: error });
}
