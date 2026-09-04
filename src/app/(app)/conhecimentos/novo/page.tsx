import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SourcePicker } from "@/components/sources/source-picker";
import { TagPicker } from "@/components/tags/tag-picker";
import { listAreas } from "@/features/areas/queries";
import { buildAreaTree, flattenAreaTree } from "@/features/areas/tree";
import { createKnowledgeAction } from "@/features/knowledge/actions";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";
import { listSourceOptions } from "@/features/sources/queries";
import { listTags } from "@/features/tags/queries";

export const metadata: Metadata = {
  title: "Novo conhecimento",
};

export default async function NewKnowledgePage() {
  const [areas, tags, sources] = await Promise.all([listAreas(), listTags(), listSourceOptions()]);
  const areaOptions = flattenAreaTree(buildAreaTree(areas));

  return (
    <>
      <PageHeader
        title="Novo conhecimento"
        description="Registre agora, refine depois. Um conhecimento não precisa estar pronto para valer a pena existir."
      />

      <KnowledgeForm
        action={createKnowledgeAction}
        areaOptions={areaOptions}
        submitLabel="Criar conhecimento"
        tagPicker={<TagPicker name="tagIds" tags={tags} />}
        sourcePicker={<SourcePicker name="sourceIds" sources={sources} />}
      />
    </>
  );
}
