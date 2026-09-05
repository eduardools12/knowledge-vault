"use client";

import { SparklesIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { suggestKnowledgeFromInboxItemAction } from "@/features/inbox/actions";
import { IDLE_SUGGESTION_STATE } from "@/features/inbox/ai-suggestion-prompt";

/**
 * "IA sugere; o usuário decide" (docs/ai.md): this button never touches
 * `knowledge`. It only asks for a suggestion and, once it has one, navigates
 * back to this same page with the suggestion in the URL — the page then
 * renders the ordinary create form pre-filled with it, exactly as editable as
 * if the user had typed those values themselves.
 *
 * Encoding the suggestion in the URL rather than in client state is what lets
 * `KnowledgeForm`, `TagPicker` and `AreaSelectField` stay the plain Server
 * Components they already are — no new client-rendered picker just for this.
 */
export function AiSuggestButton({ itemId }: { itemId: string }) {
  const [state, formAction] = useActionState(suggestKnowledgeFromInboxItemAction, IDLE_SUGGESTION_STATE);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const params = new URLSearchParams();
    params.set("aiTitle", state.suggestion.title);
    params.set("aiSummary", state.suggestion.summary);
    params.set("aiLevel", state.suggestion.level);

    if (state.suggestion.areaId) {
      params.set("aiArea", state.suggestion.areaId);
    }

    if (state.suggestion.tagIds.length > 0) {
      params.set("aiTags", state.suggestion.tagIds.join(","));
    }

    if (state.possibleDuplicate) {
      params.set("aiDup", state.possibleDuplicate.id);
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [state, router, pathname]);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="itemId" value={itemId} />

      <SubmitButton pendingLabel="Analisando…" variant="outline">
        <SparklesIcon className="size-4" aria-hidden="true" />
        Sugerir com IA
      </SubmitButton>

      {state.status === "error" ? (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
