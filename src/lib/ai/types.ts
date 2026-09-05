import type { z } from "zod";

/**
 * Provider-agnostic shapes for talking to an LLM.
 *
 * Nothing outside `src/lib/ai/` should import `@anthropic-ai/sdk` directly —
 * that is the whole point of this layer, per docs/ai.md: swapping providers,
 * even for a locally-hosted model, must not mean rewriting every call site
 * that needs a completion.
 */

export type AiRole = "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompletionRequest = {
  /** Kept separate from `messages`, the same shape every provider expects it in. */
  system?: string;
  messages: AiMessage[];
  /** Hard ceiling on the response, and the input to the pre-flight cost estimate. */
  maxTokens: number;
  /**
   * Ceiling on what this one call may cost, in USD, checked before the
   * request goes out. Falls back to `client.ts`'s own default when absent —
   * every call has *some* ceiling, never an unbounded one.
   */
  maxCostUsd?: number;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiCompletionResult = {
  text: string;
  model: string;
  usage: AiUsage;
  /** Computed from the usage the provider actually reported, never an estimate. */
  costUsd: number;
};

/**
 * A completion constrained to a Zod schema — used whenever a feature needs a
 * suggestion to fill in specific fields (a title, an area id, a set of tag
 * ids) rather than free-form prose. Enforced by the provider itself, not by
 * asking for JSON in the prompt and hoping.
 */
export type AiStructuredRequest<T> = {
  system?: string;
  messages: AiMessage[];
  maxTokens: number;
  maxCostUsd?: number;
  schema: z.ZodType<T>;
};

export type AiStructuredResult<T> = {
  data: T;
  model: string;
  usage: AiUsage;
  costUsd: number;
};

/**
 * What any provider must implement. `AnthropicProvider` is the only one
 * today; a local-model provider would be a second file implementing the same
 * shape, per docs/ai.md's "não depender de um único fornecedor a ponto de não
 * poder trocar".
 */
export interface AiProvider {
  readonly name: string;
  /** The exact model id in use, so `client.ts` can price a pre-flight estimate generically. */
  readonly model: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
  completeStructured<T>(request: AiStructuredRequest<T>): Promise<AiStructuredResult<T>>;
}
