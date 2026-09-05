import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { SourcePicker } from "@/components/sources/source-picker";
import { TagPicker } from "@/components/tags/tag-picker";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { AiSuggestButton } from "@/features/inbox/components/ai-suggest-button";
import { processInboxItemAction } from "@/features/inbox/actions";
import { getInboxItemById } from "@/features/inbox/queries";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";
import { documentFromPlainText } from "@/features/knowledge/document";
import { getKnowledgeById } from "@/features/knowledge/queries";
import { listSourceOptions } from "@/features/sources/queries";
import { listTags } from "@/features/tags/queries";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Transformar em conhecimento",
};

function firstOrUndefined(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProcessInboxItemPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const item = await getInboxItemById(id);

  if (!item) {
    notFound();
  }

  // Already processed: the form this page would show does not apply to a
  // second attempt, and the useful next step is the record it already became.
  if (item.knowledgeId) {
    redirect(`${ROUTES.knowledge}/${item.knowledgeId}`);
  }

  const raw = await searchParams;

  // What `AiSuggestButton` put in the URL after asking for a suggestion —
  // never trusted further than "pre-fill a field with this text": the actual
  // save still goes through `processInboxItemAction`'s own Zod validation, so
  // a tampered query string can, at worst, submit a form with odd values in
  // it — exactly as if the user had typed them.
  const aiTitle = firstOrUndefined(raw.aiTitle);
  const aiSummary = firstOrUndefined(raw.aiSummary);
  const aiLevelRaw = firstOrUndefined(raw.aiLevel);
  const aiLevel: KnowledgeLevel | undefined = KNOWLEDGE_LEVELS.find((level) => level === aiLevelRaw);
  const aiArea = firstOrUndefined(raw.aiArea);
  const aiTags = firstOrUndefined(raw.aiTags)?.split(",").filter(Boolean) ?? [];
  const aiDup = firstOrUndefined(raw.aiDup);

  const [areas, tags, sources, possibleDuplicate] = await Promise.all([
    listAreas(),
    listTags(),
    listSourceOptions(),
    aiDup ? getKnowledgeById(aiDup) : null,
  ]);
  const areaOptions = flattenAreaTree(buildAreaTree(areas));

  // What the capture actually carries, folded into one starting draft. A link
  // becomes a line of text here rather than a clickable mark — a fine trade
  // for a first draft the user is about to rewrite anyway.
  const initialText = [item.url, item.content, item.note]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return (
    <>
      <PageHeader
        title="Transformar em conhecimento"
        description="O item continua na inbox, marcado como processado e apontando para o que ele virou."
      />

      <div className="mb-6 grid gap-4">
        <AiSuggestButton itemId={item.id} />

        {possibleDuplicate ? (
          <Alert>
            <TriangleAlertIcon className="size-4" aria-hidden="true" />
            <AlertTitle>Isto pode já existir</AlertTitle>
            <AlertDescription>
              <Link
                href={`${ROUTES.knowledge}/${possibleDuplicate.id}`}
                className="underline underline-offset-4"
              >
                {possibleDuplicate.title}
              </Link>{" "}
              parece cobrir algo parecido. Vale conferir antes de criar outro registro.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <KnowledgeForm
        action={processInboxItemAction}
        initialValues={{
          title: aiTitle ?? item.title,
          summary: aiSummary,
          level: aiLevel,
          areaId: aiArea,
          content: documentFromPlainText(initialText),
        }}
        areaOptions={areaOptions}
        submitLabel="Criar conhecimento"
        tagPicker={<TagPicker name="tagIds" tags={tags} selectedIds={aiTags} />}
        sourcePicker={<SourcePicker name="sourceIds" sources={sources} />}
        hiddenFields={<input type="hidden" name="inboxItemId" value={item.id} />}
      />
    </>
  );
}
