import { describe, expect, it } from "vitest";

import { relationFormSchema, resolveRelationEndpoints } from "@/features/relations/schemas";

/**
 * `resolveRelationEndpoints` decides which id becomes `from_id` and which
 * becomes `to_id` — get it backwards and every relation is stored with its
 * two ends swapped, silently. "depende de" would read as "é pré-requisito
 * de" and nothing would crash to say so.
 */
describe("resolveRelationEndpoints", () => {
  it("makes the current record the subject when direction is 'from'", () => {
    expect(resolveRelationEndpoints("current-id", "target-id", "from")).toEqual({
      fromId: "current-id",
      toId: "target-id",
    });
  });

  it("makes the current record the object when direction is 'to'", () => {
    expect(resolveRelationEndpoints("current-id", "target-id", "to")).toEqual({
      fromId: "target-id",
      toId: "current-id",
    });
  });
});

describe("relationFormSchema", () => {
  const base = { targetId: "11111111-1111-4111-8111-111111111111", type: "related_to", direction: "from" };

  it("accepts a minimal relation with no note", () => {
    const result = relationFormSchema.safeParse({ ...base, note: "" });

    expect(result.success).toBe(true);
  });

  it("turns an untouched note into null rather than an empty string", () => {
    const result = relationFormSchema.parse({ ...base, note: "" });

    expect(result.note).toBeNull();
  });

  it("trims a note but keeps its content", () => {
    const result = relationFormSchema.parse({ ...base, note: "  por causa do capítulo 3  " });

    expect(result.note).toBe("por causa do capítulo 3");
  });

  it("rejects a target that is not a uuid", () => {
    const result = relationFormSchema.safeParse({ ...base, targetId: "not-a-uuid", note: "" });

    expect(result.success).toBe(false);
  });

  it("rejects a type outside the eight known relation types", () => {
    const result = relationFormSchema.safeParse({ ...base, type: "loves", note: "" });

    expect(result.success).toBe(false);
  });

  it("rejects a direction that is neither 'from' nor 'to'", () => {
    const result = relationFormSchema.safeParse({ ...base, direction: "sideways", note: "" });

    expect(result.success).toBe(false);
  });
});
