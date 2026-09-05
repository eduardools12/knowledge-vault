import { describe, expect, it } from "vitest";

import { projectFormSchema } from "@/features/projects/schemas";

/**
 * The one non-obvious rule here is the date order check: get the comparison
 * backwards and a project with `started > ended` would save silently instead
 * of failing — exactly the database's own `projects_date_order` constraint,
 * restated here for a readable message instead of a raw violation.
 */
describe("projectFormSchema", () => {
  const base = { name: "Scouting report", description: "", status: "idea" };

  it("accepts a project with neither date set", () => {
    const result = projectFormSchema.safeParse({ ...base, startedAt: "", endedAt: "" });

    expect(result.success).toBe(true);
  });

  it("accepts an end date on or after the start date", () => {
    const onLater = projectFormSchema.safeParse({ ...base, startedAt: "2026-01-01", endedAt: "2026-06-01" });
    const sameDay = projectFormSchema.safeParse({ ...base, startedAt: "2026-01-01", endedAt: "2026-01-01" });

    expect(onLater.success).toBe(true);
    expect(sameDay.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = projectFormSchema.safeParse({ ...base, startedAt: "2026-06-01", endedAt: "2026-01-01" });

    expect(result.success).toBe(false);
  });

  it("accepts an end date with no start date, and vice versa", () => {
    const endOnly = projectFormSchema.safeParse({ ...base, startedAt: "", endedAt: "2026-01-01" });
    const startOnly = projectFormSchema.safeParse({ ...base, startedAt: "2026-01-01", endedAt: "" });

    expect(endOnly.success).toBe(true);
    expect(startOnly.success).toBe(true);
  });

  it("turns untouched date fields into null rather than empty strings", () => {
    const result = projectFormSchema.parse({ ...base, startedAt: "", endedAt: "" });

    expect(result.startedAt).toBeNull();
    expect(result.endedAt).toBeNull();
  });

  it("rejects a malformed date", () => {
    const result = projectFormSchema.safeParse({ ...base, startedAt: "01/01/2026", endedAt: "" });

    expect(result.success).toBe(false);
  });
});
