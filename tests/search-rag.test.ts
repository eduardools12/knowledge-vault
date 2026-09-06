import { describe, expect, it } from "vitest";

import {
  buildRagPrompt,
  selectContextCandidates,
  toOfferedResult,
  type RagCandidate,
} from "@/features/search/rag-prompt";

function candidate(overrides: Partial<RagCandidate> = {}): RagCandidate {
  return {
    type: "knowledge",
    id: "11111111-1111-4111-8111-111111111111",
    title: "Título",
    secondary: null,
    body: "corpo",
    ...overrides,
  };
}

describe("selectContextCandidates", () => {
  it("keeps every candidate when the budget is generous", () => {
    const candidates = [candidate({ id: "a" }), candidate({ id: "b" })];

    expect(selectContextCandidates(candidates, 10_000)).toEqual(candidates);
  });

  it("drops candidates once the next one would cross the budget", () => {
    // Each formatted block (heading + a 200-char body) is ~57 tokens — a
    // budget of 90 comfortably fits one candidate but not two.
    const candidates = [
      candidate({ id: "a", body: "a".repeat(200) }),
      candidate({ id: "b", body: "b".repeat(200) }),
      candidate({ id: "c", body: "c".repeat(200) }),
    ];

    expect(selectContextCandidates(candidates, 90).map((c) => c.id)).toEqual(["a"]);
  });

  it("skips an over-budget candidate rather than stopping there", () => {
    // "big" alone exceeds the budget, but "small" after it still fits.
    const candidates = [
      candidate({ id: "big", body: "x".repeat(4000) }),
      candidate({ id: "small", body: "y" }),
    ];

    expect(selectContextCandidates(candidates, 20).map((c) => c.id)).toEqual(["small"]);
  });

  it("returns nothing for an empty candidate list", () => {
    expect(selectContextCandidates([], 10_000)).toEqual([]);
  });

  it("returns nothing when even the smallest candidate exceeds the budget", () => {
    expect(selectContextCandidates([candidate({ body: "x".repeat(4000) })], 1)).toEqual([]);
  });
});

describe("buildRagPrompt", () => {
  it("includes the question as the user message, unmodified", () => {
    const { user } = buildRagPrompt("Como funciona xG?", [candidate()]);

    expect(user).toBe("Como funciona xG?");
  });

  it("labels the context as data, not instruction", () => {
    const { system } = buildRagPrompt("pergunta", [candidate()]);

    expect(system).toMatch(/dado, não instrução/);
  });

  it("includes every candidate's id, title and body in the context", () => {
    const { system } = buildRagPrompt("pergunta", [
      candidate({ id: "know-1", title: "Expected Goals", secondary: "resumo", body: "corpo do texto" }),
      candidate({ type: "source", id: "src-1", title: "Artigo sobre xG", body: "conteúdo da fonte" }),
    ]);

    expect(system).toContain("know-1");
    expect(system).toContain("Expected Goals");
    expect(system).toContain("resumo");
    expect(system).toContain("corpo do texto");
    expect(system).toContain("src-1");
    expect(system).toContain("Artigo sobre xG");
    expect(system).toContain("conteúdo da fonte");
  });

  it("distinguishes knowledge from source headings", () => {
    const { system } = buildRagPrompt("pergunta", [
      candidate({ type: "knowledge", id: "k" }),
      candidate({ type: "source", id: "s" }),
    ]);

    expect(system).toContain("[Conhecimento k]");
    expect(system).toContain("[Fonte s]");
  });
});

/**
 * `ragAnswerSchema` only guarantees a citation has a syntactically valid
 * `{type, id}` shape — this is what actually stops a hallucinated id (or one
 * belonging to context that got trimmed by the token budget) from reaching
 * the UI as a clickable link to nowhere.
 */
describe("toOfferedResult", () => {
  const candidates = [
    candidate({ type: "knowledge", id: "know-1", title: "Expected Goals" }),
    candidate({ type: "source", id: "src-1", title: "Artigo sobre xG" }),
  ];

  it("keeps a citation that was actually offered, resolving its title", () => {
    const result = toOfferedResult(
      { answered: true, answer: "resposta", citations: [{ type: "knowledge", id: "know-1" }] },
      candidates,
    );

    expect(result.citations).toEqual([{ type: "knowledge", id: "know-1", title: "Expected Goals" }]);
  });

  it("drops a citation whose id was never offered", () => {
    const result = toOfferedResult(
      { answered: true, answer: "resposta", citations: [{ type: "knowledge", id: "made-up-id" }] },
      candidates,
    );

    expect(result.citations).toEqual([]);
  });

  it("drops a citation whose id was offered under a different type", () => {
    // "know-1" exists, but as a knowledge id, not a source id.
    const result = toOfferedResult(
      { answered: true, answer: "resposta", citations: [{ type: "source", id: "know-1" }] },
      candidates,
    );

    expect(result.citations).toEqual([]);
  });

  it("de-duplicates a citation repeated by the model", () => {
    const result = toOfferedResult(
      {
        answered: true,
        answer: "resposta",
        citations: [
          { type: "knowledge", id: "know-1" },
          { type: "knowledge", id: "know-1" },
        ],
      },
      candidates,
    );

    expect(result.citations).toHaveLength(1);
  });

  it("leaves answered and answer untouched", () => {
    const result = toOfferedResult({ answered: false, answer: "não sei", citations: [] }, candidates);

    expect(result.answered).toBe(false);
    expect(result.answer).toBe("não sei");
  });
});
