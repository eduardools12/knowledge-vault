"use client";

import { SparklesIcon } from "lucide-react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { generateReviewQuestionsAction } from "@/features/reviews/actions";
import { IDLE_QUESTIONS_STATE } from "@/features/reviews/questions-prompt";

/**
 * "Perguntas de revisão geradas a partir do próprio conteúdo" — the third
 * deliverable the `/revisoes` placeholder promised. A recall prompt before
 * rating, not an answer to read: the questions never show an answer
 * alongside them, on purpose (see `buildQuestionsPrompt`'s doc comment).
 *
 * Never auto-generated on page load — same restraint as `AiSuggestButton`
 * (Etapa 10) and `AskVaultButton` (Etapa 12): an AI call costs money, so it
 * only happens on an explicit click.
 */
export function GenerateQuestionsButton({ knowledgeId }: { knowledgeId: string }) {
  const [state, formAction] = useActionState(generateReviewQuestionsAction, IDLE_QUESTIONS_STATE);

  return (
    <div className="grid gap-3">
      <form action={formAction}>
        <input type="hidden" name="knowledgeId" value={knowledgeId} />

        <SubmitButton pendingLabel="Gerando…" variant="outline">
          <SparklesIcon className="size-4" aria-hidden="true" />
          Gerar perguntas para se testar
        </SubmitButton>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <ul className="grid gap-2 rounded-lg border p-3 text-sm">
          {state.questions.map((question, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-muted-foreground">{index + 1}.</span>
              <span>{question}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
