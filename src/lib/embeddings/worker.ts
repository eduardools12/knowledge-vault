import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildIndexableText, chunkText } from "@/lib/embeddings/chunking";
import { embedTexts } from "@/lib/embeddings/client";
import { EmbeddingError } from "@/lib/embeddings/errors";
import { estimateTokens } from "@/lib/embeddings/pricing";
import type { Database } from "@/types/database";

/**
 * Processes one batch of the `embedding_jobs` queue.
 *
 * Not independently unit-tested, same as `src/lib/ai/client.ts` — it is a
 * thin orchestrator over a real Supabase client and `embedTexts`, both of
 * which need a live service to mean anything. What is unit-tested is what
 * this function delegates to: `chunkText` / `buildIndexableText`
 * (`src/lib/embeddings/chunking.ts`) for the actual splitting logic. This
 * file is verified by code review and by running the worker for real —
 * see docs/development.md's note on `server-only`.
 *
 * Called by the route handler at `src/app/api/jobs/embeddings`, which Vercel
 * Cron hits on a schedule (see vercel.json). Takes a caller-supplied client
 * rather than constructing its own, so a test could pass a fake — the
 * service-role client itself (`createSupabaseServiceClient`) is what makes
 * this reach every user's rows, not this function.
 */

const JOB_BATCH_SIZE = 5;

/** A job that fails this many times is parked as 'error' instead of retried forever. */
const MAX_ATTEMPTS = 3;

type EmbeddingJobRow = Database["public"]["Tables"]["embedding_jobs"]["Row"];
type OwnerType = Database["public"]["Enums"]["embedding_owner_type"];

export type ProcessJobsResult = {
  claimed: number;
  succeeded: number;
  failed: number;
};

export async function processEmbeddingJobs(
  supabase: SupabaseClient<Database>,
): Promise<ProcessJobsResult> {
  const { data: pending, error: readError } = await supabase
    .from("embedding_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(JOB_BATCH_SIZE);

  if (readError) {
    throw new EmbeddingError(`Falha ao ler a fila de embeddings: ${readError.message}`);
  }

  if (!pending || pending.length === 0) {
    return { claimed: 0, succeeded: 0, failed: 0 };
  }

  // Marked 'processing' up front, before any work: a personal vault with one
  // cron trigger at a time will not race itself, but a job that crashes the
  // process mid-batch should not be silently indistinguishable from one that
  // was never picked up at all.
  await supabase
    .from("embedding_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((job) => job.id),
    );

  let succeeded = 0;
  let failed = 0;

  for (const job of pending) {
    try {
      await processJob(supabase, job);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      await recordFailure(supabase, job, error);
    }
  }

  return { claimed: pending.length, succeeded, failed };
}

async function processJob(supabase: SupabaseClient<Database>, job: EmbeddingJobRow): Promise<void> {
  const text = await fetchIndexableText(supabase, job.owner_type, job.owner_id, job.user_id);

  // Nothing to index: the owner was deleted after the job was enqueued (a
  // race the cleanup trigger usually wins, but not always), or every
  // indexable field is empty. Either way, this is a completed job, not a
  // failed one — there is nothing wrong to retry.
  if (text === null) {
    await markDone(supabase, job.id);
    return;
  }

  await deleteExistingEmbeddings(supabase, job.owner_type, job.owner_id);

  const chunks = chunkText(text);

  if (chunks.length === 0) {
    await markDone(supabase, job.id);
    return;
  }

  const result = await embedTexts(job.user_id, { texts: chunks });

  const rows = chunks.map((content, index) => ({
    user_id: job.user_id,
    owner_type: job.owner_type,
    owner_id: job.owner_id,
    chunk_index: index,
    content,
    token_count: estimateTokens(content),
    model: result.model,
    // The generated column type is `string` — pgvector's own text input
    // format (`"[0.1,0.2,...]"`), the same shape `search_knowledge_semantic`
    // expects for `query_embedding`. See features/search/queries.ts.
    embedding: JSON.stringify(result.vectors[index]),
  }));

  const { error: insertError } = await supabase.from("embeddings").insert(rows);

  if (insertError) {
    throw new EmbeddingError(`Falha ao gravar embeddings: ${insertError.message}`);
  }

  await markDone(supabase, job.id);
}

/**
 * `null` means "nothing to embed", covering both "the owner is gone" and "the
 * owner has no indexable text" — the caller treats both as a completed job.
 *
 * Filters by `user_id` in addition to `id` even though the service-role
 * client already bypasses RLS: the same defence-in-depth every composite
 * foreign key in this schema applies (docs/database.md) — a job row's
 * `user_id` should never be able to read a different user's record even if
 * some future bug lets `owner_id` collide across tenants (ids are UUIDs, so
 * in practice this cannot happen, but the check costs nothing).
 */
async function fetchIndexableText(
  supabase: SupabaseClient<Database>,
  ownerType: OwnerType,
  ownerId: string,
  userId: string,
): Promise<string | null> {
  if (ownerType === "knowledge") {
    const { data } = await supabase
      .from("knowledge")
      .select("title, summary, content_text")
      .eq("id", ownerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return null;
    }

    return buildIndexableText([data.title, data.summary, data.content_text]) || null;
  }

  if (ownerType === "source") {
    const { data } = await supabase
      .from("sources")
      .select("title, description, content")
      .eq("id", ownerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return null;
    }

    return buildIndexableText([data.title, data.description, data.content]) || null;
  }

  // 'inbox_item': the schema has carried this owner type since Etapa 1, but
  // Etapa 11 deliberately only indexes knowledge and sources — see docs/ai.md.
  // No trigger ever enqueues one, so this branch exists only to make the
  // worker inert rather than throwing if that changes incompletely later.
  return null;
}

async function deleteExistingEmbeddings(
  supabase: SupabaseClient<Database>,
  ownerType: OwnerType,
  ownerId: string,
): Promise<void> {
  // Replace, not merge: an edit can add, remove or reorder chunks, and there
  // is no stable way to match an old chunk to a new one across it. Clearing
  // first keeps `embeddings` an exact reflection of the record's current
  // text, at the cost of `chunk_index` being resettable rather than a stable
  // identity — nothing addresses a chunk by its index across edits.
  const { error } = await supabase
    .from("embeddings")
    .delete()
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId);

  if (error) {
    throw new EmbeddingError(`Falha ao limpar embeddings antigos: ${error.message}`);
  }
}

async function markDone(supabase: SupabaseClient<Database>, jobId: string): Promise<void> {
  const { error } = await supabase
    .from("embedding_jobs")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    console.error(`[embeddings] could not mark job ${jobId} done:`, error.message);
  }
}

async function recordFailure(
  supabase: SupabaseClient<Database>,
  job: EmbeddingJobRow,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`[embeddings] job ${job.id} (${job.owner_type}/${job.owner_id}) failed:`, message);

  const attempts = job.attempts + 1;
  // Back to 'pending' to retry next run, unless this was the last chance —
  // an unbounded retry would turn one permanently broken job (a model that
  // keeps rejecting the same content) into a standing drain on the budget
  // ceiling in `embedTexts`, run after run.
  const status = attempts >= MAX_ATTEMPTS ? "error" : "pending";

  const { error: updateError } = await supabase
    .from("embedding_jobs")
    .update({ status, attempts, last_error: message.slice(0, 2000), updated_at: new Date().toISOString() })
    .eq("id", job.id);

  if (updateError) {
    console.error(`[embeddings] could not record failure for job ${job.id}:`, updateError.message);
  }
}
