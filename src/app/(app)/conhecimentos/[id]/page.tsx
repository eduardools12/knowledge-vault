import { ArchiveIcon, BookMarkedIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { TagBadge } from "@/components/tags/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KnowledgeActions } from "@/features/knowledge/components/knowledge-actions";
import { RenderedContent } from "@/features/knowledge/components/rendered-content";
import { getKnowledgeById, listKnowledgeOptions } from "@/features/knowledge/queries";
import { listProjectsForKnowledge } from "@/features/projects/queries";
import { RelationForm } from "@/features/relations/components/relation-form";
import { RelationList } from "@/features/relations/components/relation-list";
import { listRelationsForKnowledge } from "@/features/relations/queries";
import { formatDate, formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { KNOWLEDGE_LEVEL_META, SOURCE_TYPE_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  // `getKnowledgeById` is memoised for the render pass, so this does not cost a
  // second query.
  return { title: knowledge?.title ?? "Conhecimento" };
}

export default async function KnowledgeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  if (!knowledge) {
    // Also the answer for a record belonging to somebody else: RLS filtered it
    // out, and "does not exist" is the right thing to say either way.
    notFound();
  }

  const [relations, targetOptions, projects] = await Promise.all([
    listRelationsForKnowledge(id),
    listKnowledgeOptions(id),
    listProjectsForKnowledge(id),
  ]);

  const now = new Date();
  const level = KNOWLEDGE_LEVEL_META[knowledge.level];

  return (
    <article className="grid gap-8">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {knowledge.status === "draft" ? <Badge variant="outline">Rascunho</Badge> : null}
            {knowledge.status === "archived" ? (
              <Badge variant="secondary">
                <ArchiveIcon className="size-3" aria-hidden="true" />
                Arquivado
              </Badge>
            ) : null}
            {knowledge.area ? <Badge variant="secondary">{knowledge.area.name}</Badge> : null}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance">{knowledge.title}</h1>

          {knowledge.summary ? (
            <p className="text-muted-foreground max-w-prose">{knowledge.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <LevelIndicator level={knowledge.level} />
            <span className="text-muted-foreground">— {level.description}</span>
          </span>

          {knowledge.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>

        <KnowledgeActions
          id={knowledge.id}
          title={knowledge.title}
          isArchived={knowledge.status === "archived"}
        />
      </header>

      <Separator />

      <RenderedContent document={knowledge.content} />

      <Separator />

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">
          Fontes{knowledge.sources.length > 0 ? ` (${knowledge.sources.length})` : ""}
        </h2>

        {knowledge.sources.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma fonte vinculada.{" "}
            <Link href={`${ROUTES.knowledge}/${knowledge.id}/editar`} className="underline underline-offset-4">
              Vincular ao editar
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {knowledge.sources.map((source) => (
              <li key={source.id} className="bg-card">
                <Link
                  href={`${ROUTES.sources}/${source.id}`}
                  className="hover:bg-accent/40 focus-visible:ring-ring flex items-center gap-2 px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <BookMarkedIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{source.title}</span>
                  <Badge variant="outline" className="shrink-0">
                    {SOURCE_TYPE_LABELS[source.type]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <section className="grid gap-4">
        <h2 className="text-sm font-medium">
          Relacionamentos
          {relations.outgoing.length + relations.incoming.length > 0
            ? ` (${relations.outgoing.length + relations.incoming.length})`
            : ""}
        </h2>

        {relations.outgoing.length === 0 && relations.incoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma relação com outro conhecimento ainda.
          </p>
        ) : (
          <div className="grid gap-3">
            <RelationList relations={relations.outgoing} knowledgeId={knowledge.id} direction="outgoing" />
            <RelationList relations={relations.incoming} knowledgeId={knowledge.id} direction="incoming" />
          </div>
        )}

        <RelationForm knowledgeId={knowledge.id} targetOptions={targetOptions} />
      </section>

      <Separator />

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">
          Projetos{projects.length > 0 ? ` (${projects.length})` : ""}
        </h2>

        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum projeto usa este conhecimento ainda.{" "}
            <Link href={ROUTES.projects} className="underline underline-offset-4">
              Vincular a partir de um projeto
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {projects.map((project) => (
              <li key={project.id} className="bg-card px-4 py-2.5">
                <Link
                  href={`${ROUTES.projects}/${project.id}`}
                  className="text-sm underline-offset-4 hover:underline"
                >
                  {project.name}
                </Link>
                {project.note ? (
                  <p className="text-muted-foreground text-xs">{project.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <footer className="grid gap-4">
        <h2 className="text-sm font-medium">Histórico</h2>

        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <MetaRow label="Criado em" value={formatDate(knowledge.createdAt)} iso={knowledge.createdAt} />
          <MetaRow
            label="Última atualização"
            value={formatRelativeTime(knowledge.updatedAt, now)}
            iso={knowledge.updatedAt}
          />
          <MetaRow
            label="Última revisão"
            value={
              knowledge.lastReviewedAt
                ? formatRelativeTime(knowledge.lastReviewedAt, now)
                : "Nunca revisado"
            }
            iso={knowledge.lastReviewedAt}
          />
          <MetaRow
            label="Próxima revisão"
            value={
              knowledge.nextReviewAt ? formatDate(knowledge.nextReviewAt) : "Não agendada"
            }
            iso={knowledge.nextReviewAt}
          />
        </dl>
      </footer>
    </article>
  );
}

function MetaRow({
  label,
  value,
  iso,
}: {
  label: string;
  value: string;
  iso: string | null;
}) {
  const dateTime = iso ? toDateTimeAttribute(iso) : undefined;

  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">
        {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
      </dd>
    </div>
  );
}
