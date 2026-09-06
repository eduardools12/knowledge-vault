"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getKnowledgeById } from "@/features/knowledge/queries";
import { generateReviewQuestions } from "@/features/reviews/questions";
import type { QuestionsState } from "@/features/reviews/questions-prompt";
import { computeNextReviewDate, REVIEW_RATING_VALUES, REVIEW_RATINGS } from "@/features/reviews/schedule";
import { requireUser } from "@/lib/auth/dal";
import { describeAiError } from "@/lib/ai/errors";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const ratingSchema = z.enum(REVIEW_RATING_VALUES);

/**
 * Records one review and schedules the next. Not `useActionState` — like
 * `processInboxItemAction`, this always redirects back to the queue, so there
 * is no state for the caller to hold onto. Malformed input (a tampered hidden
 * field, a record deleted mid-review) just returns to the queue without
 * writing anything, the same quiet-no-op `setInboxStatusAction` uses for the
 * same situation.
 */
export async function submitReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const knowledgeId = idSchema.safeParse(formData.get("knowledgeId"));
  const rating = ratingSchema.safeParse(formData.get("rating"));

  if (!knowledgeId.success || !rating.success) {
    redirect(ROUTES.reviews);
  }

  const knowledge = await getKnowledgeById(knowledgeId.data);

  if (!knowledge) {
    redirect(ROUTES.reviews);
  }

  const { difficulty, confidence } = REVIEW_RATINGS[rating.data];
  const nextReviewAt = computeNextReviewDate(new Date(), knowledge.reviewCount, difficulty, confidence);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    knowledge_id: knowledge.id,
    difficulty,
    confidence,
    next_review_at: nextReviewAt.toISOString(),
    previous_level: knowledge.level,
    // `new_level` is left unset on purpose: a review records how it went, it
    // does not move the maturity level on its own. Bumping `level` stays an
    // explicit edit to the knowledge itself — two separate decisions, not
    // one button doing both.
  });

  if (error) {
    console.error("[reviews] could not record review:", error.message);
  }

  revalidatePath(ROUTES.reviews);
  revalidatePath(`${ROUTES.knowledge}/${knowledge.id}`);
  redirect(ROUTES.reviews);
}

/**
 * Generates self-test questions from a knowledge record's own content. Never
 * writes anything — the questions exist only to prompt recall before the
 * user rates how the review went, same "IA sugere; o usuário decide" as
 * every other AI feature in this app.
 */
export async function generateReviewQuestionsAction(
  _prevState: QuestionsState,
  formData: FormData,
): Promise<QuestionsState> {
  const user = await requireUser();

  const knowledgeId = idSchema.safeParse(formData.get("knowledgeId"));

  if (!knowledgeId.success) {
    return { status: "error", message: "Conhecimento inválido." };
  }

  const knowledge = await getKnowledgeById(knowledgeId.data);

  if (!knowledge) {
    return { status: "error", message: "Este conhecimento não existe mais." };
  }

  const content = [knowledge.title, knowledge.summary, knowledge.contentText].filter(Boolean).join("\n\n");

  try {
    const questions = await generateReviewQuestions(user.id, content);

    return { status: "success", questions };
  } catch (error) {
    return {
      status: "error",
      message: describeAiError(error, {
        logPrefix: "[reviews]",
        failureMessage: "Não foi possível gerar perguntas agora. Tente novamente.",
      }),
    };
  }
}
