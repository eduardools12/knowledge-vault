import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { TagPicker } from "@/components/tags/tag-picker";
import { createSourceAction } from "@/features/sources/actions";
import { SourceForm } from "@/features/sources/components/source-form";
import { listTags } from "@/features/tags/queries";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Nova fonte",
};

export default async function NewSourcePage() {
  const [user, tags] = await Promise.all([requireUser(), listTags()]);

  return (
    <>
      <PageHeader
        title="Nova fonte"
        description="De onde um conhecimento veio: um artigo, um livro, um vídeo, uma documentação."
      />

      <SourceForm
        action={createSourceAction}
        userId={user.id}
        submitLabel="Criar fonte"
        tagPicker={<TagPicker name="tagIds" tags={tags} />}
      />
    </>
  );
}
