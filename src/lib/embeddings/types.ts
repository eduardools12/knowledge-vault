/**
 * Provider-agnostic shapes for turning text into vectors.
 *
 * A sibling of `src/lib/ai/types.ts`: same reason for existing — nothing
 * outside `src/lib/embeddings/` should know which vendor is behind
 * `EmbeddingProvider`, so a second provider is a second file implementing
 * this interface, never a change to a call site.
 */

export type EmbedRequest = {
  /** One vector per text, in the same order. Batched in one call when possible. */
  texts: string[];
  maxCostUsd?: number;
};

export type EmbedUsage = { inputTokens: number };

export type EmbedResult = {
  /** One vector per input text, in the same order as `EmbedRequest.texts`. */
  vectors: number[][];
  model: string;
  usage: EmbedUsage;
  costUsd: number;
};

/**
 * What any provider must implement. `OpenAiEmbeddingProvider` is the only one
 * today; a second vendor, or a locally-hosted model, would be a second file
 * implementing this same interface.
 */
export interface EmbeddingProvider {
  readonly name: string;
  /** The exact model id in use, so `client.ts` can price a pre-flight estimate generically. */
  readonly model: string;
  /** Must match `embeddings.embedding`'s column dimension (`vector(1536)`) — see the Etapa 1 migration. */
  readonly dimensions: number;
  embed(request: EmbedRequest): Promise<EmbedResult>;
}
