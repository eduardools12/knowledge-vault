import { ArchiveIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KnowledgeActions } from "@/features/knowledge/components/knowledge-actions";
import { RenderedContent } from "@/features/knowledge/components/rendered-content";
import { getKnowledgeById } from "@/features/knowledge/queries";
import { KNOWLEDGE_LEVEL_META } from "@/lib/domain";
import { formatDate, formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";

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

        {/*
          Sources, related knowledge and projects belong on this page and arrive
          with the stages that build them (4, 6 and 7). Saying so is more useful
          than an empty section that looks broken.
        */}
        <p className="text-muted-foreground text-xs">
          Fontes, conhecimentos relacionados e projetos aparecem aqui a partir das Etapas 4, 6 e 7.
        </p>
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
