import { ExternalLinkIcon, FileIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TagBadge } from "@/components/tags/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SourceActions } from "@/features/sources/components/source-actions";
import { getSourceById } from "@/features/sources/queries";
import { formatDate, formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { SOURCE_TYPE_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const source = await getSourceById(id);

  // `getSourceById` is memoised for the render pass, so this does not cost a
  // second query.
  return { title: source?.title ?? "Fonte" };
}

export default async function SourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const source = await getSourceById(id);

  if (!source) {
    // Also the answer for a record belonging to somebody else: RLS filtered it
    // out, and "does not exist" is the right thing to say either way.
    notFound();
  }

  const now = new Date();

  return (
    <article className="grid gap-8">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{SOURCE_TYPE_LABELS[source.type]}</Badge>
            {source.tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-balance">{source.title}</h1>

          {source.description ? (
            <p className="text-muted-foreground max-w-prose">{source.description}</p>
          ) : null}

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {source.author ? <span>{source.author}</span> : null}
            {source.publishedAt ? <span>Publicado em {formatDate(source.publishedAt)}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                Abrir endereço original
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}

            {source.fileUrl ? (
              <a
                href={source.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                <FileIcon className="size-3.5" aria-hidden="true" />
                Abrir arquivo anexado
              </a>
            ) : null}
          </div>
        </div>

        <SourceActions id={source.id} title={source.title} knowledgeCount={source.knowledgeCount} />
      </header>

      {source.content ? (
        <>
          <Separator />
          <div className="grid gap-2">
            <h2 className="text-sm font-medium">Conteúdo</h2>
            <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-wrap">
              {source.content}
            </p>
          </div>
        </>
      ) : null}

      <Separator />

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">
          Conhecimentos que citam esta fonte
          {source.linkedKnowledge.length > 0 ? ` (${source.linkedKnowledge.length})` : ""}
        </h2>

        {source.linkedKnowledge.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum conhecimento cita esta fonte ainda. Vincule ao criar ou editar um conhecimento.
          </p>
        ) : (
          <ul className="grid gap-px overflow-hidden rounded-lg border">
            {source.linkedKnowledge.map((knowledge) => (
              <li key={knowledge.id} className="bg-card">
                <Link
                  href={`${ROUTES.knowledge}/${knowledge.id}`}
                  className="hover:bg-accent/40 focus-visible:ring-ring block px-4 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {knowledge.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <footer className="grid gap-1 text-xs">
        <span className="text-muted-foreground">
          Adicionada{" "}
          <time dateTime={toDateTimeAttribute(source.createdAt)}>
            {formatRelativeTime(source.createdAt, now)}
          </time>
        </span>
      </footer>
    </article>
  );
}
