import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { SourcePicker } from "@/components/sources/source-picker";
import { TagPicker } from "@/components/tags/tag-picker";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { updateKnowledgeAction } from "@/features/knowledge/actions";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";
import { getKnowledgeById } from "@/features/knowledge/queries";
import { listSourceOptions } from "@/features/sources/queries";
import { listTags } from "@/features/tags/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  return { title: knowledge ? `Editar: ${knowledge.title}` : "Editar conhecimento" };
}

export default async function EditKnowledgePage({ params }: PageProps) {
  const { id } = await params;
  const [knowledge, areas, tags, sources] = await Promise.all([
    getKnowledgeById(id),
    listAreas(),
    listTags(),
    listSourceOptions(),
  ]);

  if (!knowledge) {
    notFound();
  }

  const areaOptions = flattenAreaTree(buildAreaTree(areas));
  const selectedTagIds = knowledge.tags.map((tag) => tag.id);
  const selectedSourceIds = knowledge.sources.map((source) => source.id);

  return (
    <>
      <PageHeader title="Editar conhecimento" description={knowledge.title} />

      <KnowledgeForm
        action={updateKnowledgeAction}
        knowledge={knowledge}
        areaOptions={areaOptions}
        submitLabel="Salvar alterações"
        tagPicker={<TagPicker name="tagIds" tags={tags} selectedIds={selectedTagIds} />}
        sourcePicker={
          <SourcePicker name="sourceIds" sources={sources} selectedIds={selectedSourceIds} />
        }
      />
    </>
  );
}
