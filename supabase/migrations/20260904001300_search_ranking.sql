-- =============================================================================
-- Knowledge Vault — ranked global search
-- =============================================================================
-- PostgREST's query builder can filter (`@@`) but cannot order by an
-- expression like `ts_rank(...)` — there is no column to point `.order()` at.
-- Ranked search is exactly the kind of thing that does not fit the REST
-- interface, the same reason `dashboard_summary()` exists: two functions here,
-- one per searchable table, each doing in SQL what the client cannot ask for.
--
-- Each function tries the weighted `tsvector` match first. Only when that
-- finds nothing does it fall back to trigram similarity on the title, so a
-- misremembered or misspelt title ("padnas" for "Pandas") still surfaces
-- something — a fallback, not a competing ranking, so an exact keyword match
-- is never pushed down by a merely fuzzy title.
--
-- `word_similarity()`, not plain `similarity()`: a short misspelt word
-- compared against a whole multi-word title dilutes the trigram overlap too
-- much to clear even a low threshold ("padnas" vs "Pandas para análise de
-- dados" scores 0.10 on `similarity`, matching nothing). `word_similarity`
-- instead scores the misspelling against its best-aligned span inside the
-- title. The threshold is applied as a literal `>= 0.3` on the function's own
-- result rather than through the `<%` operator and its
-- `pg_trgm.word_similarity_threshold` GUC (default 0.6) — Supabase does not
-- allow a function to set that parameter, "permission denied to set
-- parameter". The trade-off is that this fallback cannot use the trigram
-- index and falls back to a sequential scan, which is fine here: it only ever
-- runs after the indexed keyword search has already found nothing, on a
-- table sized for one person's vault, not the whole product's.
--
-- SECURITY INVOKER, as always: every SELECT below still passes through Row
-- Level Security. There is no `where user_id = ...` on purpose, matching
-- `dashboard_summary()` — RLS supplies it, and repeating it here would suggest
-- the policy were optional.
-- =============================================================================

create or replace function public.search_knowledge(
  q_tsquery text default null,
  q_raw text default null,
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
  rank real,
  match_kind text
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
  ),
  exact as (
    select
      b.id, b.title, b.summary, b.level, b.status, b.updated_at,
      ts_rank(b.search_vector, to_tsquery('portuguese', q_tsquery)) as rank,
      'exact' as match_kind
    from base b
    where q_tsquery is not null
      and b.search_vector @@ to_tsquery('portuguese', q_tsquery)
    order by rank desc
    limit result_limit
  ),
  fuzzy as (
    select
      b.id, b.title, b.summary, b.level, b.status, b.updated_at,
      extensions.word_similarity(q_raw, b.title) as rank,
      'fuzzy' as match_kind
    from base b
    where q_raw is not null
      and not exists (select 1 from exact)
      and extensions.word_similarity(q_raw, b.title) >= 0.3
    order by rank desc
    limit result_limit
  ),
  -- Filters with no search text at all: nothing to rank, so this is a plain
  -- filtered listing, most recent first, rather than an empty result.
  unranked as (
    select
      b.id, b.title, b.summary, b.level, b.status, b.updated_at,
      0::real as rank,
      'exact' as match_kind
    from base b
    where q_tsquery is null and q_raw is null
    order by b.updated_at desc
    limit result_limit
  )
  select * from exact
  union all
  select * from fuzzy
  union all
  select * from unranked;
$$;

comment on function public.search_knowledge is
  'Ranked keyword search over knowledge, falling back to trigram title similarity when the keyword search finds nothing. SECURITY INVOKER so RLS still scopes every result to the caller.';

revoke execute on function public.search_knowledge from public, anon;
grant execute on function public.search_knowledge to authenticated;

create or replace function public.search_sources(
  q_tsquery text default null,
  q_raw text default null,
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
  rank real,
  match_kind text
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
  ),
  exact as (
    select
      b.id, b.title, b.type, b.author, b.description, b.published_at, b.created_at,
      ts_rank(b.search_vector, to_tsquery('portuguese', q_tsquery)) as rank,
      'exact' as match_kind
    from base b
    where q_tsquery is not null
      and b.search_vector @@ to_tsquery('portuguese', q_tsquery)
    order by rank desc
    limit result_limit
  ),
  fuzzy as (
    select
      b.id, b.title, b.type, b.author, b.description, b.published_at, b.created_at,
      extensions.word_similarity(q_raw, b.title) as rank,
      'fuzzy' as match_kind
    from base b
    where q_raw is not null
      and not exists (select 1 from exact)
      and extensions.word_similarity(q_raw, b.title) >= 0.3
    order by rank desc
    limit result_limit
  ),
  -- Filters with no search text at all: nothing to rank, so this is a plain
  -- filtered listing, most recent first, rather than an empty result.
  unranked as (
    select
      b.id, b.title, b.type, b.author, b.description, b.published_at, b.created_at,
      0::real as rank,
      'exact' as match_kind
    from base b
    where q_tsquery is null and q_raw is null
    order by b.created_at desc
    limit result_limit
  )
  select * from exact
  union all
  select * from fuzzy
  union all
  select * from unranked;
$$;

comment on function public.search_sources is
  'Ranked keyword search over sources, falling back to trigram title similarity when the keyword search finds nothing. SECURITY INVOKER so RLS still scopes every result to the caller.';

revoke execute on function public.search_sources from public, anon;
grant execute on function public.search_sources to authenticated;
