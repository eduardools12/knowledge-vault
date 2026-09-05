import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { SourcePicker } from "@/components/sources/source-picker";
import { TagPicker } from "@/components/tags/tag-picker";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { processInboxItemAction } from "@/features/inbox/actions";
import { getInboxItemById } from "@/features/inbox/queries";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";
import { documentFromPlainText } from "@/features/knowledge/document";
import { listSourceOptions } from "@/features/sources/queries";
import { listTags } from "@/features/tags/queries";
import { ROUTES } from "@/lib/routes";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Transformar em conhecimento",
};

export default async function ProcessInboxItemPage({ params }: PageProps) {
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

  const [areas, tags, sources] = await Promise.all([listAreas(), listTags(), listSourceOptions()]);
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

      <KnowledgeForm
        action={processInboxItemAction}
        initialValues={{ title: item.title, content: documentFromPlainText(initialText) }}
        areaOptions={areaOptions}
        submitLabel="Criar conhecimento"
        tagPicker={<TagPicker name="tagIds" tags={tags} />}
        sourcePicker={<SourcePicker name="sourceIds" sources={sources} />}
        hiddenFields={<input type="hidden" name="inboxItemId" value={item.id} />}
      />
    </>
  );
}
