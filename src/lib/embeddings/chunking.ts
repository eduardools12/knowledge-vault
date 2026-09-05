import { estimateTokens } from "@/lib/embeddings/pricing";

/**
 * Splits indexable text into vector-store chunks.
 *
 * Pure and free of `server-only` on purpose — see docs/development.md's note
 * on that package: a file that needs a unit test cannot carry the import, so
 * this logic lives apart from the worker (`src/app/api/jobs/embeddings`) that
 * actually calls `embedTexts` with its output.
 *
 * Deliberately simple: paragraphs (blank-line or newline separated) are
 * packed greedily into a chunk until the next one would cross the token
 * budget, with no overlap between chunks. A personal vault's notes are short
 * enough that losing a little cross-chunk context at a boundary is a smaller
 * cost than the complexity — and the doubled storage and citation ambiguity —
 * overlapping windows would add. A paragraph that alone exceeds the budget
 * (a wall of text with no breaks) is hard-split by character count so no
 * chunk is ever sent to the embedding API oversized.
 */

const DEFAULT_MAX_CHUNK_TOKENS = 500;
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function chunkText(text: string, maxTokens = DEFAULT_MAX_CHUNK_TOKENS): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE;
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (estimateTokens(paragraph) <= maxTokens) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxChars) {
      chunks.push(paragraph.slice(i, i + maxChars));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Joins the fields that make up what gets indexed for a record — title,
 * summary or description, and body — dropping whichever are empty. Kept
 * separate from `chunkText` so the worker can log or inspect the assembled
 * text before it gets split.
 */
export function buildIndexableText(parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}
