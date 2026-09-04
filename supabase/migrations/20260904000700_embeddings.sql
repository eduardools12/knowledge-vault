-- =============================================================================
-- Knowledge Vault — vector store (foundation for semantic search and RAG)
-- =============================================================================
-- Nothing writes to this table in the MVP. It exists now because retrofitting a
-- vector store later means re-embedding the entire vault; creating it up front
-- costs one migration and keeps Etapa 11 (semantic search) and Etapa 12 (RAG)
-- from becoming schema changes.
--
-- Design notes
-- ------------
-- * Chunked, not per-record: a long source produces many rows. `chunk_index`
--   preserves order and `content` keeps the exact text that was embedded, so a
--   RAG answer can cite the precise passage it used.
-- * `model` is part of the identity, so two embedding models can coexist during
--   a migration between them instead of forcing a big-bang re-index.
-- * The owner reference is polymorphic (`owner_type` + `owner_id`), so a
--   composite foreign key is not possible. Referential integrity is kept by the
--   cleanup trigger below rather than by the database, which is the trade-off
--   accepted for not needing three near-identical tables.
-- =============================================================================

create extension if not exists "vector" with schema extensions;

create type public.embedding_owner_type as enum (
  'knowledge',
  'source',
  'inbox_item'
);

create table public.embeddings (
  id          uuid                       primary key default gen_random_uuid(),
  user_id     uuid                       not null references auth.users (id) on delete cascade,
  owner_type  public.embedding_owner_type not null,
  owner_id    uuid                       not null,
  chunk_index integer                    not null default 0,
  -- The exact text that produced the vector, kept so answers can quote it.
  content     text                       not null,
  token_count integer,
  model       text                       not null,
  embedding   extensions.vector(1536)    not null,
  created_at  timestamptz                not null default now(),

  constraint embeddings_unique_chunk unique (owner_type, owner_id, model, chunk_index),
  constraint embeddings_chunk_index_positive check (chunk_index >= 0),
  constraint embeddings_content_not_empty check (char_length(trim(content)) > 0)
);

create index embeddings_user_id_idx on public.embeddings (user_id);
create index embeddings_owner_idx on public.embeddings (owner_type, owner_id);

-- Approximate nearest-neighbour index for cosine distance. HNSW is chosen over
-- IVFFlat because it needs no training pass and stays accurate on a table that
-- grows a few rows at a time, which is exactly the shape of a personal vault.
create index embeddings_vector_idx
  on public.embeddings using hnsw (embedding extensions.vector_cosine_ops);

alter table public.embeddings enable row level security;
revoke all on public.embeddings from anon;
grant select on public.embeddings to authenticated;

create policy embeddings_select_own on public.embeddings
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Embeddings are written by trusted server-side code holding the service role,
-- which bypasses RLS. Clients may read their own vectors but never write them:
-- an attacker-controlled vector would let a user poison their own RAG context,
-- and there is no legitimate reason for the browser to produce one.

-- -----------------------------------------------------------------------------
-- Cleanup of orphaned vectors
-- -----------------------------------------------------------------------------
-- The polymorphic owner cannot be a foreign key, so deletions are propagated
-- explicitly. Without this, deleting a knowledge record would leave its chunks
-- behind and they would keep surfacing in semantic search results.
--
-- SECURITY DEFINER is required, not incidental: `authenticated` has no DELETE
-- policy on `embeddings`, so a trigger running as the caller would have its
-- DELETE silently filtered to zero rows by RLS. Running as the table owner
-- bypasses that, and the statement is confined to the row just deleted.
create or replace function public.delete_orphaned_embeddings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.embeddings
  where owner_type = tg_argv[0]::public.embedding_owner_type
    and owner_id = old.id;

  return old;
end;
$$;

create trigger knowledge_delete_embeddings
  after delete on public.knowledge
  for each row execute function public.delete_orphaned_embeddings('knowledge');

create trigger sources_delete_embeddings
  after delete on public.sources
  for each row execute function public.delete_orphaned_embeddings('source');

create trigger inbox_items_delete_embeddings
  after delete on public.inbox_items
  for each row execute function public.delete_orphaned_embeddings('inbox_item');
