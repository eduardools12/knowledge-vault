import { describe, expect, it } from "vitest";

import { buildInsights, isVaultEmpty, plural } from "@/features/dashboard/insights";
import type { DashboardSummary } from "@/features/dashboard/queries";

/**
 * The dashboard's job is to say something worth acting on. These tests pin the
 * two things that decide whether it does: which insights appear at all, and
 * whether the sentences read correctly in Portuguese.
 */

const EMPTY: DashboardSummary = {
  knowledgeTotal: 0,
  knowledgeArchived: 0,
  sourcesTotal: 0,
  areasTotal: 0,
  tagsTotal: 0,
  projectsActive: 0,
  relationsTotal: 0,
  inboxUnprocessed: 0,
  needsReview: 0,
  withoutSources: 0,
  addedThisWeek: 0,
  updatedThisWeek: 0,
  byLevel: { discovered: 0, understood: 0, practiced: 0, mastered: 0 },
  topAreaThisWeek: null,
};

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return { ...EMPTY, ...overrides };
}

function ids(s: DashboardSummary): string[] {
  return buildInsights(s).map((insight) => insight.id);
}

function textOf(s: DashboardSummary, id: string): string {
  const found = buildInsights(s).find((insight) => insight.id === id);

  if (!found) {
    throw new Error(`insight "${id}" não foi gerado`);
  }

  return found.text;
}

describe("plural", () => {
  it("agrees with the count", () => {
    expect(plural(1, "conhecimento", "conhecimentos")).toBe("1 conhecimento");
    expect(plural(2, "conhecimento", "conhecimentos")).toBe("2 conhecimentos");
  });

  it("treats zero as plural, as Portuguese does", () => {
    expect(plural(0, "item", "itens")).toBe("0 itens");
  });
});

describe("buildInsights", () => {
  it("says nothing about an empty vault", () => {
    // The onboarding empty state covers this case far better than a list of
    // zeroes would.
    expect(buildInsights(EMPTY)).toEqual([]);
  });

  it("omits every insight whose count is zero", () => {
    // A card that reads "0" every day teaches the user to stop looking.
    expect(ids(summary({ knowledgeTotal: 5, addedThisWeek: 2 }))).toEqual(["added"]);
  });

  it("puts what is waiting on the user before the retrospective", () => {
    const result = ids(
      summary({
        knowledgeTotal: 10,
        addedThisWeek: 3,
        inboxUnprocessed: 2,
        needsReview: 1,
      }),
    );

    expect(result).toEqual(["inbox", "needs-review", "added"]);
  });

  it("marks pending work as needing attention and gives it a link", () => {
    const insights = buildInsights(summary({ knowledgeTotal: 4, inboxUnprocessed: 3 }));

    expect(insights[0]).toMatchObject({ id: "inbox", tone: "attention" });
    expect(insights[0]?.href).toBeTruthy();
    expect(insights[0]?.actionLabel).toBeTruthy();
  });

  it("leaves purely informational insights without a link", () => {
    const insights = buildInsights(summary({ knowledgeTotal: 4, addedThisWeek: 1 }));

    expect(insights[0]).toMatchObject({ id: "added", tone: "neutral" });
    expect(insights[0]?.href).toBeUndefined();
  });

  it("conjugates the singular correctly", () => {
    expect(textOf(summary({ needsReview: 1 }), "needs-review")).toBe(
      "1 conhecimento venceu para revisão.",
    );
    expect(textOf(summary({ withoutSources: 1 }), "without-sources")).toBe(
      "1 conhecimento ainda não tem nenhuma fonte.",
    );
    expect(textOf(summary({ inboxUnprocessed: 1 }), "inbox")).toBe("1 item esperando na Inbox.");
  });

  it("conjugates the plural correctly", () => {
    expect(textOf(summary({ needsReview: 4 }), "needs-review")).toBe(
      "4 conhecimentos venceram para revisão.",
    );
    expect(textOf(summary({ withoutSources: 3 }), "without-sources")).toBe(
      "3 conhecimentos ainda não têm nenhuma fonte.",
    );
    expect(textOf(summary({ inboxUnprocessed: 2 }), "inbox")).toBe("2 itens esperando na Inbox.");
  });

  it("names the area the week went into", () => {
    const s = summary({
      knowledgeTotal: 6,
      topAreaThisWeek: { id: "a1", name: "Tecnologia", total: 4 },
    });

    expect(textOf(s, "top-area")).toBe("Nesta semana seu foco foi Tecnologia.");
  });

  it("reports a quiet week only when there is a vault to be quiet about", () => {
    expect(ids(summary({ knowledgeTotal: 12 }))).toEqual(["quiet-week"]);
    expect(ids(summary({ knowledgeTotal: 0 }))).toEqual([]);
  });

  it("drops the quiet-week note as soon as anything happened", () => {
    expect(ids(summary({ knowledgeTotal: 12, updatedThisWeek: 1 }))).not.toContain("quiet-week");
  });
});

describe("isVaultEmpty", () => {
  it("is true only before anything at all has been captured", () => {
    expect(isVaultEmpty(EMPTY)).toBe(true);
  });

  it("is false once knowledge exists", () => {
    expect(isVaultEmpty(summary({ knowledgeTotal: 1 }))).toBe(false);
  });

  it("is false for someone who has only captured links so far", () => {
    // Telling a user who has filled the Inbox that the vault is empty would be
    // both wrong and discouraging.
    expect(isVaultEmpty(summary({ inboxUnprocessed: 3 }))).toBe(false);
    expect(isVaultEmpty(summary({ sourcesTotal: 2 }))).toBe(false);
  });

  it("is false when everything has been archived rather than never created", () => {
    expect(isVaultEmpty(summary({ knowledgeArchived: 4 }))).toBe(false);
  });

  it("ignores structure created without content", () => {
    // Areas and tags alone are scaffolding, not a vault worth reporting on.
    expect(isVaultEmpty(summary({ areasTotal: 3, tagsTotal: 8 }))).toBe(true);
  });
});
