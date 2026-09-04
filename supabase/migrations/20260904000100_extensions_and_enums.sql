-- =============================================================================
-- Knowledge Vault — extensions and domain enums
-- =============================================================================
-- Identifiers (tables, columns, enum values) are in English by project
-- convention; all user-facing copy is translated in the UI layer.
-- See docs/database.md for the rationale.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Maturity of a piece of knowledge. Ordered from least to most mastered;
-- the ordering is relied on by review/statistics queries.
create type public.knowledge_level as enum (
  'discovered',  -- 🟢 Descobri
  'understood',  -- 🟡 Entendi
  'practiced',   -- 🔵 Pratiquei
  'mastered'     -- 🟣 Domino
);

create type public.knowledge_status as enum (
  'draft',
  'active',
  'archived'
);

create type public.source_type as enum (
  'article',
  'book',
  'pdf',
  'video',
  'documentation',
  'website',
  'course',
  'paper',
  'podcast',
  'news',
  'post',
  'other'
);

-- Semantics are directional: A --depends_on--> B reads "A depends on B".
create type public.relation_type as enum (
  'related_to',
  'depends_on',
  'example_of',
  'part_of',
  'complements',
  'contradicts',
  'applies',
  'originates_from'
);

create type public.inbox_kind as enum (
  'link',
  'note',
  'file',
  'idea',
  'reference'
);

create type public.inbox_status as enum (
  'unprocessed',
  'in_review',
  'processed',
  'archived'
);

create type public.project_status as enum (
  'idea',
  'active',
  'paused',
  'done',
  'archived'
);
