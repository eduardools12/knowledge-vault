import "server-only";

import type { ReviewQueueItem } from "@/features/reviews/schedule";
import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads for the daily review queue.
 *
 * Only `active` knowledge is offered — the same "not now" a draft or an
 * archived record already means everywhere else in the app applies here: a
 * draft is not finished being written yet, and archiving is how a user says
 * to stop being asked about something.
 */

type QueueRow = {
  id: string;
  title: string;
  summary: string | null;
  level: ReviewQueueItem["level"];
  next_review_at: string | null;
  area: ReviewQueueItem["area"];
};

export async function listDueReviews(): Promise<ReviewQueueItem[]> {
  await requireUser();

  // Computed here, not as a `now()` inside the filter string: PostgREST's
  // filter syntax compares against a literal value, not a SQL expression —
  // passing the literal text "now()" would just fail to parse as a timestamp.
  const now = new Date().toISOString();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge")
    .select("id, title, summary, level, next_review_at, area:areas!knowledge_area_fk(id, name, color)")
    .eq("status", "active")
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    // Never-reviewed records first (`null` sorts first ascending in Postgres),
    // then whatever has been overdue longest — the two situations "fila do
    // dia" is actually meant to surface, in the order worth clearing first.
    .order("next_review_at", { ascending: true, nullsFirst: true })
    .limit(100);

  if (error) {
    console.error("[reviews] queue failed:", error.message);

    return [];
  }

  return (data as QueueRow[] | null ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    area: row.area,
    nextReviewAt: row.next_review_at,
  }));
}
