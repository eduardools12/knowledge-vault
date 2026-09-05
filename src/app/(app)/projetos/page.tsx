import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectListItem } from "@/features/projects/components/project-list-item";
import { listProjects } from "@/features/projects/queries";
import { projectFiltersSchema } from "@/features/projects/schemas";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Projetos",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = projectFiltersSchema.parse(raw);

  const projects = await listProjects(filters);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Onde o conhecimento vira prática — e deixa de ser só teoria."
        action={
          <ButtonLink href={`${ROUTES.projects}/novo`}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Novo
          </ButtonLink>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="Nenhum projeto ainda"
          description="Um projeto é onde o conhecimento é aplicado de verdade. Registre um e vincule o que você usou nele."
          action={
            <ButtonLink href={`${ROUTES.projects}/novo`} size="lg">
              Criar o primeiro
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-lg border">
          {projects.map((project) => (
            <ProjectListItem key={project.id} project={project} now={now} />
          ))}
        </ul>
      )}
    </>
  );
}
