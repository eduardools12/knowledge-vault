import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { updateKnowledgeAction } from "@/features/knowledge/actions";
import { KnowledgeForm } from "@/features/knowledge/components/knowledge-form";
import { getKnowledgeById } from "@/features/knowledge/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  return { title: knowledge ? `Editar: ${knowledge.title}` : "Editar conhecimento" };
}

export default async function EditKnowledgePage({ params }: PageProps) {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  if (!knowledge) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar conhecimento" description={knowledge.title} />

      <KnowledgeForm
        action={updateKnowledgeAction}
        knowledge={knowledge}
        submitLabel="Salvar alterações"
      />
    </>
  );
}
