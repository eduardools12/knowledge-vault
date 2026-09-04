/**
 * The domain vocabulary, mirroring the Postgres enums one-to-one.
 *
 * Database identifiers are English and user-facing copy is Portuguese. This
 * file is the single place the two meet: SQL stays idiomatic and portable,
 * translation never leaks into queries, and renaming a label cannot silently
 * change a stored value.
 *
 * Each list is declared `as const` and the union type is derived from it, so
 * adding a value to the database and forgetting it here becomes a type error at
 * the first exhaustive `switch` rather than a blank badge in production.
 */

import type { Database } from "@/types/database";

export type Described<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

// -----------------------------------------------------------------------------
// Knowledge maturity
// -----------------------------------------------------------------------------

export const KNOWLEDGE_LEVELS = ["discovered", "understood", "practiced", "mastered"] as const;
export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number];

/**
 * Ordered from least to most mastered. The order is meaningful — progress
 * metrics and review scheduling both depend on it.
 */
export const KNOWLEDGE_LEVEL_META: Record<
  KnowledgeLevel,
  Described<KnowledgeLevel> & { emoji: string }
> = {
  discovered: {
    value: "discovered",
    label: "Descobri",
    description: "Acabei de encontrar o assunto.",
    emoji: "🟢",
  },
  understood: {
    value: "understood",
    label: "Entendi",
    description: "Consigo explicar o conceito.",
    emoji: "🟡",
  },
  practiced: {
    value: "practiced",
    label: "Pratiquei",
    description: "Já utilizei na prática.",
    emoji: "🔵",
  },
  mastered: {
    value: "mastered",
    label: "Domino",
    description: "Consigo usar ou explicar sem consultar a fonte.",
    emoji: "🟣",
  },
};

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

export const KNOWLEDGE_STATUSES = ["draft", "active", "archived"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

// -----------------------------------------------------------------------------
// Sources
// -----------------------------------------------------------------------------

export const SOURCE_TYPES = [
  "article",
  "book",
  "pdf",
  "video",
  "documentation",
  "website",
  "course",
  "paper",
  "podcast",
  "news",
  "post",
  "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  article: "Artigo",
  book: "Livro",
  pdf: "PDF",
  video: "Vídeo",
  documentation: "Documentação",
  website: "Site",
  course: "Curso",
  paper: "Paper",
  podcast: "Podcast",
  news: "Notícia",
  post: "Postagem",
  other: "Outro",
};

// -----------------------------------------------------------------------------
// Knowledge graph edges
// -----------------------------------------------------------------------------

export const RELATION_TYPES = [
  "related_to",
  "depends_on",
  "example_of",
  "part_of",
  "complements",
  "contradicts",
  "applies",
  "originates_from",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

/**
 * Relations are directional and read `from --label--> to`. `inverseLabel` is how
 * the same edge reads on the target's page, which is what lets one stored row
 * render correctly from both ends.
 */
export const RELATION_TYPE_META: Record<
  RelationType,
  Described<RelationType> & { inverseLabel: string }
> = {
  related_to: { value: "related_to", label: "relaciona-se com", inverseLabel: "relaciona-se com" },
  depends_on: { value: "depends_on", label: "depende de", inverseLabel: "é pré-requisito de" },
  example_of: { value: "example_of", label: "é exemplo de", inverseLabel: "tem como exemplo" },
  part_of: { value: "part_of", label: "é parte de", inverseLabel: "contém" },
  complements: { value: "complements", label: "complementa", inverseLabel: "é complementado por" },
  contradicts: { value: "contradicts", label: "contradiz", inverseLabel: "é contradito por" },
  applies: { value: "applies", label: "aplica", inverseLabel: "é aplicado em" },
  originates_from: { value: "originates_from", label: "tem origem em", inverseLabel: "deu origem a" },
};

// -----------------------------------------------------------------------------
// Inbox
// -----------------------------------------------------------------------------

export const INBOX_KINDS = ["link", "note", "file", "idea", "reference"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

export const INBOX_KIND_LABELS: Record<InboxKind, string> = {
  link: "Link",
  note: "Anotação",
  file: "Arquivo",
  idea: "Ideia",
  reference: "Referência",
};

export const INBOX_STATUSES = ["unprocessed", "in_review", "processed", "archived"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = {
  unprocessed: "Não processado",
  in_review: "Em análise",
  processed: "Processado",
  archived: "Arquivado",
};

// -----------------------------------------------------------------------------
// Projects
// -----------------------------------------------------------------------------

export const PROJECT_STATUSES = ["idea", "active", "paused", "done", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Ideia",
  active: "Em andamento",
  paused: "Pausado",
  done: "Concluído",
  archived: "Arquivado",
};

// -----------------------------------------------------------------------------
// Compile-time agreement with the database
// -----------------------------------------------------------------------------
// The unions above are hand-written, and the enums in `src/types/database.ts`
// are generated from the live schema. Nothing stops the two drifting apart —
// except this.
//
// `ExactlyEquals` tests assignability in both directions, so it catches a value
// added to the database and not to this file *and* a value invented here that
// the database would reject. It resolves to `false`, never to `never`: `never`
// is assignable to everything, so an assertion built on it would silently pass.
//
// `Assert<T extends true>` is what turns a mismatch into an actual error —
// `false` does not satisfy `extends true`, so `npm run typecheck` fails right
// after `npm run db:types` instead of the drift surfacing as a blank badge or a
// rejected insert weeks later.
//
// Exported so the assertions count as used; there is no runtime footprint.

type ExactlyEquals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Assert<T extends true> = T;

type DbEnums = Database["public"]["Enums"];

export type DomainMatchesDatabase = [
  Assert<ExactlyEquals<KnowledgeLevel, DbEnums["knowledge_level"]>>,
  Assert<ExactlyEquals<KnowledgeStatus, DbEnums["knowledge_status"]>>,
  Assert<ExactlyEquals<SourceType, DbEnums["source_type"]>>,
  Assert<ExactlyEquals<RelationType, DbEnums["relation_type"]>>,
  Assert<ExactlyEquals<InboxKind, DbEnums["inbox_kind"]>>,
  Assert<ExactlyEquals<InboxStatus, DbEnums["inbox_status"]>>,
  Assert<ExactlyEquals<ProjectStatus, DbEnums["project_status"]>>,
];
