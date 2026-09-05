import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { updateProjectAction } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/project-form";
import { getProjectById } from "@/features/projects/queries";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  return { title: project ? `Editar: ${project.name}` : "Editar projeto" };
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar projeto" description={project.name} />

      <ProjectForm action={updateProjectAction} project={project} submitLabel="Salvar alterações" />
    </>
  );
}
