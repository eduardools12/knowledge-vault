import { describe, expect, it } from "vitest";

import { computeIntervalDays, computeNextReviewDate, isDueForReview } from "@/features/reviews/schedule";

describe("computeIntervalDays", () => {
  it("schedules for tomorrow on low confidence, regardless of history", () => {
    // Confidence 1 or 2 ("Esqueci" / "Difícil") always means "see it again
    // soon" — no amount of prior review history should stretch this out.
    expect(computeIntervalDays(0, 5, 1)).toBe(1);
    expect(computeIntervalDays(20, 5, 2)).toBe(1);
    expect(computeIntervalDays(20, 1, 2)).toBe(1);
  });

  it("never returns less than one day", () => {
    expect(computeIntervalDays(0, 5, 3)).toBeGreaterThanOrEqual(1);
  });

  it("grows with review history, for the same rating", () => {
    const first = computeIntervalDays(0, 2, 4);
    const fifth = computeIntervalDays(4, 2, 4);
    const tenth = computeIntervalDays(9, 2, 4);

    expect(fifth).toBeGreaterThan(first);
    expect(tenth).toBeGreaterThan(fifth);
  });

  it("schedules further out for an easier, more confident review at the same history", () => {
    const reviewCount = 3;
    const hard = computeIntervalDays(reviewCount, 4, 3); // still above the confidence floor
    const easy = computeIntervalDays(reviewCount, 1, 5);

    expect(easy).toBeGreaterThan(hard);
  });

  it("caps the ladder rather than growing forever", () => {
    // Comfortably past the ladder's last step either way — both should land
    // on the same ceiling.
    const far = computeIntervalDays(50, 1, 5);
    const farther = computeIntervalDays(500, 1, 5);

    expect(far).toBe(farther);
  });
});

describe("computeNextReviewDate", () => {
  it("adds exactly computeIntervalDays' result, in days", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const days = computeIntervalDays(2, 2, 4);

    const next = computeNextReviewDate(now, 2, 2, 4);

    expect(next.getTime() - now.getTime()).toBe(days * 24 * 60 * 60 * 1000);
  });

  it("does not mutate the date it was given", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const before = now.getTime();

    computeNextReviewDate(now, 0, 3, 3);

    expect(now.getTime()).toBe(before);
  });
});

describe("isDueForReview", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("treats a record never reviewed as due", () => {
    expect(isDueForReview(null, now)).toBe(true);
  });

  it("treats a past schedule as due", () => {
    expect(isDueForReview("2026-06-14T00:00:00Z", now)).toBe(true);
  });

  it("treats the exact instant as due", () => {
    expect(isDueForReview(now.toISOString(), now)).toBe(true);
  });

  it("treats a future schedule as not due", () => {
    expect(isDueForReview("2026-06-16T00:00:00Z", now)).toBe(false);
  });
});
