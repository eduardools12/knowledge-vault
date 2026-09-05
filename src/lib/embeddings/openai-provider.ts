import "server-only";

import OpenAI, { APIError, AuthenticationError, RateLimitError } from "openai";

import { EmbeddingConfigError, EmbeddingProviderError, EmbeddingRateLimitError } from "@/lib/embeddings/errors";
import { costForUsage, isPricedEmbeddingModel } from "@/lib/embeddings/pricing";
import type { EmbedRequest, EmbedResult, EmbeddingProvider } from "@/lib/embeddings/types";
import { getServerEnv } from "@/lib/env";

/**
 * The only file in the app that imports `openai`.
 *
 * The Anthropic API has no embeddings endpoint, so a second vendor is
 * unavoidable here — see docs/ai.md. `text-embedding-3-small` was chosen
 * specifically because it produces 1536-dimensional vectors natively, the
 * exact dimension `embeddings.embedding` was already fixed to since Etapa 1,
 * with no truncation or schema change needed.
 */

const DEFAULT_MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const { OPENAI_API_KEY } = getServerEnv();

  if (!OPENAI_API_KEY) {
    throw new EmbeddingConfigError(
      "OPENAI_API_KEY não está configurada. Defina-a em .env.local para gerar embeddings.",
    );
  }

  cachedClient = new OpenAI({ apiKey: OPENAI_API_KEY });

  return cachedClient;
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly model: string;
  readonly dimensions = DIMENSIONS;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  async embed(request: EmbedRequest): Promise<EmbedResult> {
    const client = getClient();

    let response;

    try {
      response = await client.embeddings.create({
        model: this.model,
        input: request.texts,
        dimensions: this.dimensions,
      });
    } catch (error) {
      throw translateError(error);
    }

    // The API documents ordering as matching the input, but sorting by the
    // index it actually returns costs nothing and removes the assumption.
    const vectors = [...response.data].sort((a, b) => a.index - b.index).map((item) => item.embedding);

    const usage = { inputTokens: response.usage.total_tokens };

    return {
      vectors,
      model: response.model,
      usage,
      // Falls back to 0 rather than throwing: a model this app does not have
      // a price for yet should not make an otherwise-successful call fail.
      costUsd: isPricedEmbeddingModel(response.model) ? costForUsage(response.model, usage.inputTokens) : 0,
    };
  }
}

/**
 * Maps the SDK's own exception types to ours, most specific first — the same
 * shape `src/lib/ai/anthropic-provider.ts` uses for its own vendor, so a
 * caller of `embedTexts` never needs to know which SDK is behind it.
 */
function translateError(error: unknown): Error {
  if (error instanceof AuthenticationError) {
    return new EmbeddingConfigError("A chave de API da OpenAI foi rejeitada. Verifique OPENAI_API_KEY.", {
      cause: error,
    });
  }

  if (error instanceof RateLimitError) {
    return new EmbeddingRateLimitError(
      "O provedor de embedding recusou a chamada por limite de taxa. Tente novamente em instantes.",
      { cause: error },
    );
  }

  if (error instanceof APIError) {
    return new EmbeddingProviderError(`Falha no provedor de embedding (${error.status}): ${error.message}`, {
      cause: error,
    });
  }

  return new EmbeddingProviderError("Falha inesperada ao gerar embedding.", { cause: error });
}
