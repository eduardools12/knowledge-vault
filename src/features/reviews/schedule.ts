/**
 * The spaced-repetition scheduler. Pure and free of `server-only`, same
 * reason as `src/lib/embeddings/chunking.ts`: the orchestration that reads
 * and writes `reviews` needs a live Supabase client, but the actual
 * scheduling decision does not, and deserves a direct test.
 *
 * Deliberately not SM-2. A real SM-2 needs a per-card "ease factor" carried
 * forward between reviews, and the schema (fixed since Etapa 1) has no
 * column for one — only `difficulty`, `confidence` and the running
 * `review_count`, already the source of every metric on the knowledge page.
 * Building on exactly those columns means this stage costs no migration, at
 * the price of a simpler curve than SM-2's.
 */

import type { KnowledgeLevel } from "@/lib/domain";

/**
 * The four buttons the review screen offers, Anki-style, instead of two
 * separate 1–5 sliders. Reviewing a dozen items a day rewards one fast
 * decision per card far more than two Likert scales would — the schema still
 * gets a `difficulty` and a `confidence` value out of it, just a preset pair
 * instead of an independently-dialled one.
 */
export const REVIEW_RATINGS = {
  forgot: { value: "forgot", label: "Esqueci", difficulty: 5, confidence: 1 },
  hard: { value: "hard", label: "Difícil", difficulty: 4, confidence: 2 },
  good: { value: "good", label: "Bom", difficulty: 2, confidence: 4 },
  easy: { value: "easy", label: "Fácil", difficulty: 1, confidence: 5 },
} as const satisfies Record<string, { value: string; label: string; difficulty: number; confidence: number }>;

export type ReviewRating = keyof typeof REVIEW_RATINGS;

export const REVIEW_RATING_VALUES = Object.keys(REVIEW_RATINGS) as ReviewRating[];

/**
 * Doubling-ish steps indexed by how many times this record has been reviewed
 * before. Only reached when `confidence > 2` — below that, `computeIntervalDays`
 * returns early and this ladder never applies at all.
 */
const INTERVAL_LADDER_DAYS = [1, 2, 4, 7, 14, 30, 60, 120] as const;

/**
 * Days until the next review. `reviewCount` is the number of *previous*
 * reviews (0 for a record never reviewed before this one).
 *
 * Confidence 1–2 ("Esqueci" / "Difícil") always schedules for tomorrow,
 * regardless of history — a struggle means "see this again soon" full stop,
 * not "a little sooner than the ladder said". There is no separate streak
 * counter to reset here the way SM-2 resets its repetition count on a lapse;
 * forcing the interval back to 1 has the same effect without needing one.
 *
 * Confidence 3+ ("Bom" / "Fácil") walks `reviewCount` up the ladder, then
 * nudges the result by how hard the material was and how confident the
 * answer felt — harder shortens it, more confident lengthens it.
 */
export function computeIntervalDays(reviewCount: number, difficulty: number, confidence: number): number {
  if (confidence <= 2) {
    return 1;
  }

  const base = INTERVAL_LADDER_DAYS[Math.min(reviewCount, INTERVAL_LADDER_DAYS.length - 1)];

  // difficulty 1 → ×1.30, 3 → ×1.00, 5 → ×0.70
  const difficultyFactor = 1 - (difficulty - 3) * 0.15;
  // confidence 3 → ×1.15, 4 → ×1.30, 5 → ×1.45
  const confidenceFactor = 0.7 + confidence * 0.15;

  return Math.max(1, Math.round(base * difficultyFactor * confidenceFactor));
}

/** `computeIntervalDays`, applied to a clock. Split out so callers never add days by hand. */
export function computeNextReviewDate(now: Date, reviewCount: number, difficulty: number, confidence: number): Date {
  const next = new Date(now);
  next.setDate(next.getDate() + computeIntervalDays(reviewCount, difficulty, confidence));
  return next;
}

export type ReviewQueueItem = {
  id: string;
  title: string;
  summary: string | null;
  level: KnowledgeLevel;
  area: { id: string; name: string; color: string | null } | null;
  /** `null` means never reviewed — always due. */
  nextReviewAt: string | null;
};

/** A record with no review history is due immediately, same as one whose schedule has passed. */
export function isDueForReview(nextReviewAt: string | null, now: Date): boolean {
  return nextReviewAt === null || new Date(nextReviewAt).getTime() <= now.getTime();
}
