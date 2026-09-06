import "server-only";

import { buildQuestionsPrompt, reviewQuestionsSchema } from "@/features/reviews/questions-prompt";
import { completeStructuredWithAi } from "@/lib/ai/client";

export async function generateReviewQuestions(userId: string, content: string): Promise<string[]> {
  const { system, user } = buildQuestionsPrompt(content);

  const result = await completeStructuredWithAi(userId, {
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 512,
    schema: reviewQuestionsSchema,
  });

  return result.data.questions;
}
