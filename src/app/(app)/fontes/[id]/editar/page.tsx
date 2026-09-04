import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { TagPicker } from "@/components/tags/tag-picker";
import { updateSourceAction } from "@/features/sources/actions";
import { SourceForm } from "@/features/sources/components/source-form";
import { getSourceById } from "@/features/sources/queries";
import { listTags } from "@/features/tags/queries";
import { requireUser } from "@/lib/auth/dal";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const source = await getSourceById(id);

  return { title: source ? `Editar: ${source.title}` : "Editar fonte" };
}

export default async function EditSourcePage({ params }: PageProps) {
  const { id } = await params;
  const [user, source, tags] = await Promise.all([requireUser(), getSourceById(id), listTags()]);

  if (!source) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar fonte" description={source.title} />

      <SourceForm
        action={updateSourceAction}
        source={source}
        userId={user.id}
        submitLabel="Salvar alterações"
        tagPicker={
          <TagPicker name="tagIds" tags={tags} selectedIds={source.tags.map((tag) => tag.id)} />
        }
      />
    </>
  );
}
