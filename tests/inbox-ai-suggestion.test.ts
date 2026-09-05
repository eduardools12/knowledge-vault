import { describe, expect, it } from "vitest";

import { buildSuggestionPrompt, keepOnlyOfferedIds } from "@/features/inbox/ai-suggestion-prompt";

describe("buildSuggestionPrompt", () => {
  it("lists every offered area and tag by id and name", () => {
    const { system } = buildSuggestionPrompt(
      { title: null, url: null, content: "algo", note: null },
      [{ id: "area-1", name: "Futebol" }],
      [{ id: "tag-1", name: "xg" }],
    );

    expect(system).toContain("area-1: Futebol");
    expect(system).toContain("tag-1: xg");
  });

  it("says so explicitly when there are no areas or tags to offer", () => {
    const { system } = buildSuggestionPrompt({ title: null, url: null, content: "algo", note: null }, [], []);

    expect(system).toContain("nenhuma área cadastrada");
    expect(system).toContain("nenhuma tag cadastrada");
  });

  it("joins every text field the item carries into the source text", () => {
    const { sourceText } = buildSuggestionPrompt(
      { title: "Pandas", url: "https://pandas.pydata.org", content: "biblioteca de dados", note: "ver depois" },
      [],
      [],
    );

    expect(sourceText).toContain("Pandas");
    expect(sourceText).toContain("https://pandas.pydata.org");
    expect(sourceText).toContain("biblioteca de dados");
    expect(sourceText).toContain("ver depois");
  });

  it("falls back to a placeholder when the item carries no text at all", () => {
    const { sourceText } = buildSuggestionPrompt({ title: null, url: null, content: null, note: null }, [], []);

    expect(sourceText).toBe("(sem conteúdo)");
  });
});

/**
 * The schema only constrains shape — a hallucinated id is still a
 * syntactically valid UUID — so this is the actual guarantee that a
 * suggestion never points at an area or tag that does not exist. Getting it
 * wrong would not crash; it would just let a made-up id slip into the create
 * form's URL.
 */
describe("keepOnlyOfferedIds", () => {
  const areas = [{ id: "area-1", name: "Futebol" }];
  const tags = [
    { id: "tag-1", name: "xg" },
    { id: "tag-2", name: "dados" },
  ];

  it("keeps an area id that was actually offered", () => {
    const result = keepOnlyOfferedIds(
      { title: "t", summary: "s", level: "discovered", areaId: "area-1", tagIds: [] },
      areas,
      tags,
    );

    expect(result.areaId).toBe("area-1");
  });

  it("drops an area id that was never offered", () => {
    const result = keepOnlyOfferedIds(
      { title: "t", summary: "s", level: "discovered", areaId: "made-up-id", tagIds: [] },
      areas,
      tags,
    );

    expect(result.areaId).toBeNull();
  });

  it("keeps a null area id as null", () => {
    const result = keepOnlyOfferedIds(
      { title: "t", summary: "s", level: "discovered", areaId: null, tagIds: [] },
      areas,
      tags,
    );

    expect(result.areaId).toBeNull();
  });

  it("keeps only the tag ids that were actually offered", () => {
    const result = keepOnlyOfferedIds(
      { title: "t", summary: "s", level: "discovered", areaId: null, tagIds: ["tag-1", "made-up-tag", "tag-2"] },
      areas,
      tags,
    );

    expect(result.tagIds).toEqual(["tag-1", "tag-2"]);
  });

  it("leaves title, summary and level untouched", () => {
    const result = keepOnlyOfferedIds(
      { title: "Pandas", summary: "resumo", level: "understood", areaId: null, tagIds: [] },
      areas,
      tags,
    );

    expect(result.title).toBe("Pandas");
    expect(result.summary).toBe("resumo");
    expect(result.level).toBe("understood");
  });
});
