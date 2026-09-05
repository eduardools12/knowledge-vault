-- =============================================================================
-- Knowledge Vault — indexing queue and semantic search (Etapa 11)
-- =============================================================================
-- Two pieces:
--
-- 1. `embedding_jobs` — a queue table plus triggers that enqueue a job
--    whenever a knowledge record's or source's indexable columns change.
--    Nothing here calls an embedding model: this is Postgres recording "this
--    needs re-indexing", picked up asynchronously by the worker at
--    src/app/api/jobs/embeddings/route.ts, which holds the service role and
--    is the only thing that ever writes to `public.embeddings`.
--
-- 2. `search_knowledge_semantic` / `search_sources_semantic` — cosine-distance
--    ranking over `public.embeddings`, the semantic half of hybrid search.
--    Same shape and same reasoning as `search_knowledge` / `search_sources`
--    in the Etapa 8 migration: PostgREST cannot order by an expression, so
--    ranking has to happen in a function. `features/search/queries.ts`
--    combines this function's results with the keyword functions' via
--    Reciprocal Rank Fusion in application code, rather than attempting one
--    SQL query that ranks two incomparable scores (`ts_rank` and cosine
--    distance) against each other.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- embedding_jobs
-- -----------------------------------------------------------------------------
create type public.embedding_job_status as enum (
  'pending',
  'processing',
  'done',
  'error'
);

create table public.embedding_jobs (
  id         uuid                          primary key default gen_random_uuid(),
  user_id    uuid                          not null references auth.users (id) on delete cascade,
  owner_type public.embedding_owner_type   not null,
  owner_id   uuid                          not null,
  status     public.embedding_job_status   not null default 'pending',
  attempts   integer                       not null default 0,
  last_error text,
  created_at timestamptz                   not null default now(),
  updated_at timestamptz                   not null default now(),

  -- One job per owner, ever. Editing the same record five times before the
  -- worker runs once resets this same row to 'pending' instead of piling up
  -- five redundant jobs — see `enqueue_embedding_job` below.
  constraint embedding_jobs_unique_owner unique (owner_type, owner_id),
  constraint embedding_jobs_attempts_positive check (attempts >= 0)
);

-- Only pending jobs are ever scanned for by the worker, oldest first.
create index embedding_jobs_pending_idx
  on public.embedding_jobs (created_at)
  where status = 'pending';

alter table public.embedding_jobs enable row level security;
revoke all on public.embedding_jobs from anon;
grant select on public.embedding_jobs to authenticated;

create policy embedding_jobs_select_own on public.embedding_jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Jobs are written only by the trigger below (SECURITY DEFINER) and by the
-- worker, which holds the service role and so bypasses RLS entirely. There is
-- no INSERT/UPDATE/DELETE policy for `authenticated` — same lockdown as
-- `public.embeddings`, for the same reason: no legitimate client write.

-- -----------------------------------------------------------------------------
-- Enqueue on content change
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER is required, not incidental: `authenticated` has no INSERT
-- policy on `embedding_jobs`, so a trigger running as the caller would have
-- its INSERT silently filtered by RLS. Running as the table owner bypasses
-- that, and the statement only ever touches the single row for `new.id`.
--
-- Triggered on specific columns, not on every UPDATE: touching `status` or
-- `archived_at` on a knowledge record — far more frequent than an edit to its
-- actual content — must not spend an embedding call on text that did not
-- change. Cost is a limit, not a detail (docs/ai.md).
create or replace function public.enqueue_embedding_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_type public.embedding_owner_type := tg_argv[0]::public.embedding_owner_type;
begin
  insert into public.embedding_jobs (user_id, owner_type, owner_id, status, attempts, last_error, updated_at)
  values (new.user_id, v_owner_type, new.id, 'pending', 0, null, now())
  on conflict (owner_type, owner_id)
  do update set status = 'pending', attempts = 0, last_error = null, updated_at = now();

  return new;
end;
$$;

create trigger knowledge_enqueue_embedding_job
  after insert or update of title, summary, content_text on public.knowledge
  for each row execute function public.enqueue_embedding_job('knowledge');

create trigger sources_enqueue_embedding_job
  after insert or update of title, description, content on public.sources
  for each row execute function public.enqueue_embedding_job('source');

revoke execute on function public.enqueue_embedding_job() from anon, authenticated, public;

-- -----------------------------------------------------------------------------
-- Cleanup of orphaned jobs
-- -----------------------------------------------------------------------------
-- Mirrors `delete_orphaned_embeddings` from the Etapa 1 migration. Without
-- this, deleting a knowledge record mid-indexing would leave a job pointing
-- at nothing; the worker already tolerates a missing owner defensively, but
-- there is no reason to leave the row behind for it to find.
create or replace function public.delete_orphaned_embedding_jobs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.embedding_jobs
  where owner_type = tg_argv[0]::public.embedding_owner_type
    and owner_id = old.id;

  return old;
end;
$$;

create trigger knowledge_delete_embedding_jobs
  after delete on public.knowledge
  for each row execute function public.delete_orphaned_embedding_jobs('knowledge');

create trigger sources_delete_embedding_jobs
  after delete on public.sources
  for each row execute function public.delete_orphaned_embedding_jobs('source');

revoke execute on function public.delete_orphaned_embedding_jobs() from anon, authenticated, public;

-- -----------------------------------------------------------------------------
-- Semantic search
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER, as always: every SELECT below still passes through Row
-- Level Security, on both `embeddings` and the joined table — a caller only
-- ever sees a match backed by an embedding row they own, joined to a
-- knowledge/source row they own. In practice the two always agree, but this
-- costs nothing and does not depend on that agreement holding.
--
-- `min(... <=>  ...)` rather than one row per chunk: a record is chunked into
-- several embedding rows, and this returns one ranked hit per record, taken
-- from whichever chunk is the closest match — the same "best chunk wins"
-- shape RAG (Etapa 12) will reuse to decide which passage to cite.
create or replace function public.search_knowledge_semantic(
  query_embedding extensions.vector(1536),
  filter_area uuid default null,
  filter_tag uuid default null,
  filter_level public.knowledge_level default null,
  filter_status public.knowledge_status default null,
  result_limit int default 20
)
returns table (
  id uuid,
  title text,
  summary text,
  level public.knowledge_level,
  status public.knowledge_status,
  updated_at timestamptz,
  distance real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select k.*
    from public.knowledge k
    where (filter_area is null or k.area_id = filter_area)
      and (filter_level is null or k.level = filter_level)
      and (filter_status is null or k.status = filter_status)
      and (
        filter_tag is null
        or exists (
          select 1 from public.knowledge_tags kt
          where kt.knowledge_id = k.id and kt.tag_id = filter_tag
        )
      )
  )
  select
    b.id, b.title, b.summary, b.level, b.status, b.updated_at,
    -- `OPERATOR(extensions.<=>)`, not bare `<=>`: with `search_path = ''`,
    -- operator resolution needs the same explicit schema a function call
    -- would, which a bare symbol cannot carry.
    min(e.embedding operator (extensions.<=>) query_embedding) as distance
  from base b
  join public.embeddings e on e.owner_type = 'knowledge' and e.owner_id = b.id
  group by b.id, b.title, b.summary, b.level, b.status, b.updated_at
  order by distance asc
  limit result_limit;
$$;

comment on function public.search_knowledge_semantic is
  'Cosine-distance ranking of knowledge over public.embeddings, one row per record (its closest chunk). The semantic half of hybrid search — see features/search/queries.ts for the Reciprocal Rank Fusion merge with search_knowledge.';

revoke execute on function public.search_knowledge_semantic from public, anon;
grant execute on function public.search_knowledge_semantic to authenticated;

create or replace function public.search_sources_semantic(
  query_embedding extensions.vector(1536),
  filter_tag uuid default null,
  filter_type public.source_type default null,
  result_limit int default 20
)
returns table (
  id uuid,
  title text,
  type public.source_type,
  author text,
  description text,
  published_at date,
  created_at timestamptz,
  distance real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select s.*
    from public.sources s
    where (filter_type is null or s.type = filter_type)
      and (
        filter_tag is null
        or exists (
          select 1 from public.source_tags st
          where st.source_id = s.id and st.tag_id = filter_tag
        )
      )
  )
  select
    b.id, b.title, b.type, b.author, b.description, b.published_at, b.created_at,
    min(e.embedding operator (extensions.<=>) query_embedding) as distance
  from base b
  join public.embeddings e on e.owner_type = 'source' and e.owner_id = b.id
  group by b.id, b.title, b.type, b.author, b.description, b.published_at, b.created_at
  order by distance asc
  limit result_limit;
$$;

comment on function public.search_sources_semantic is
  'Cosine-distance ranking of sources over public.embeddings, one row per record (its closest chunk). The semantic half of hybrid search — see features/search/queries.ts for the Reciprocal Rank Fusion merge with search_sources.';

revoke execute on function public.search_sources_semantic from public, anon;
grant execute on function public.search_sources_semantic to authenticated;
