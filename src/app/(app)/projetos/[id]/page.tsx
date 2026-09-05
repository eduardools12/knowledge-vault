import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { listKnowledgeOptions } from "@/features/knowledge/queries";
import { ProjectActions } from "@/features/projects/components/project-actions";
import { ProjectKnowledgeForm } from "@/features/projects/components/project-knowledge-form";
import { ProjectKnowledgeList } from "@/features/projects/components/project-knowledge-list";
import { getProjectById } from "@/features/projects/queries";
import { formatDate } from "@/lib/dates";
import { PROJECT_STATUS_LABELS } from "@/lib/domain";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  // `getProjectById` is memoised for the render pass, so this does not cost a
  // second query.
  return { title: project?.name ?? "Projeto" };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    // Also the answer for a record belonging to somebody else: RLS filtered it
    // out, and "does not exist" is the right thing to say either way.
    notFound();
  }

  const allKnowledge = await listKnowledgeOptions();
  const linkedIds = new Set(project.knowledge.map((item) => item.id));
  const availableKnowledge = allKnowledge.filter((item) => !linkedIds.has(item.id));

  return (
    <article className="grid gap-8">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance">{project.name}</h1>

          {project.description ? (
            <p className="text-muted-foreground max-w-prose">{project.description}</p>
          ) : null}

          {project.startedAt || project.endedAt ? (
            <p className="text-muted-foreground text-sm">
              {project.startedAt ? formatDate(project.startedAt) : "Sem início definido"}
              {" — "}
              {project.endedAt ? formatDate(project.endedAt) : "em andamento"}
            </p>
          ) : null}
        </div>

        <ProjectActions id={project.id} name={project.name} knowledgeCount={project.knowledgeCount} />
      </header>

      <Separator />

      <section className="grid gap-4">
        <h2 className="text-sm font-medium">
          Conhecimentos usados{project.knowledgeCount > 0 ? ` (${project.knowledgeCount})` : ""}
        </h2>

        {project.knowledge.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum conhecimento vinculado ainda.</p>
        ) : (
          <ProjectKnowledgeList items={project.knowledge} projectId={project.id} />
        )}

        <ProjectKnowledgeForm projectId={project.id} options={availableKnowledge} />
      </section>
    </article>
  );
}
