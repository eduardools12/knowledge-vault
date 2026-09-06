"use client";

import { CircleHelpIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { askVaultAction } from "@/features/search/actions";
import { IDLE_RAG_STATE, type RagResult } from "@/features/search/rag-prompt";
import type { SearchFilters } from "@/features/search/schemas";
import { ROUTES } from "@/lib/routes";

/**
 * "Perguntar à IA" on `/busca` — Etapa 12's RAG, deliberately placed inside
 * the existing search page rather than a page of its own (the sidebar's ten
 * sections were fixed from the start; see README). A question is always
 * scoped to exactly the filters producing the visible results below it,
 * carried here as hidden fields rather than re-read from the URL, so the
 * answer never silently searches something other than what the user sees.
 *
 * Never auto-triggered by typing — same restraint as `AiSuggestButton`
 * (Etapa 10): an AI call costs money, so it happens only on an explicit
 * click, never as a side effect of debounced search input.
 */
export function AskVaultButton({ filters }: { filters: SearchFilters }) {
  const [state, formAction] = useActionState(askVaultAction, IDLE_RAG_STATE);

  return (
    <div className="grid gap-3">
      <form action={formAction}>
        <input type="hidden" name="q" value={filters.q ?? ""} />
        {filters.area ? <input type="hidden" name="area" value={filters.area} /> : null}
        {filters.tag ? <input type="hidden" name="tag" value={filters.tag} /> : null}
        {filters.level ? <input type="hidden" name="level" value={filters.level} /> : null}
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        {filters.sourceType ? <input type="hidden" name="sourceType" value={filters.sourceType} /> : null}

        <SubmitButton pendingLabel="Perguntando…" variant="outline">
          <SparklesIcon className="size-4" aria-hidden="true" />
          Perguntar à IA
        </SubmitButton>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="text-destructive text-xs">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? <RagAnswerCard result={state.result} /> : null}
    </div>
  );
}

function RagAnswerCard({ result }: { result: RagResult }) {
  return (
    <Alert>
      {result.answered ? <SparklesIcon className="size-4" aria-hidden="true" /> : <CircleHelpIcon className="size-4" aria-hidden="true" />}
      <AlertTitle>{result.answered ? "Resposta" : "Não encontrei no acervo"}</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>{result.answer}</p>

        {result.citations.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.citations.map((citation) => (
              <Link
                key={`${citation.type}:${citation.id}`}
                href={`${citation.type === "knowledge" ? ROUTES.knowledge : ROUTES.sources}/${citation.id}`}
              >
                <Badge variant="outline" className="hover:bg-accent/40 cursor-pointer transition-colors">
                  {citation.title}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
