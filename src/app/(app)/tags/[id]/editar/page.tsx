import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { TagForm } from "@/features/tags/components/tag-form";
import { getTagById } from "@/features/tags/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tag = await getTagById(id);

  return { title: tag ? `Editar: ${tag.name}` : "Editar tag" };
}

export default async function EditTagPage({ params }: PageProps) {
  const { id } = await params;
  const tag = await getTagById(id);

  if (!tag) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar tag" description={tag.name} />
      <TagForm tag={tag} />
    </>
  );
}
