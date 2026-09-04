-- =============================================================================
-- Knowledge Vault — full-text search
-- =============================================================================
-- Two complementary mechanisms:
--
--   1. A stored `tsvector` generated column for ranked keyword search. It is a
--      GENERATED column rather than a trigger, so it can never drift out of
--      sync with the row it describes.
--   2. Trigram indexes on titles, so a misremembered or misspelt title still
--      matches (`ILIKE '%pandas%'` stays fast).
--
-- The dictionary is the built-in `portuguese` configuration, which gives
-- stemming and stop-words for the primary language of the vault. It is passed
-- as an explicit regconfig argument because the one-argument form of
-- to_tsvector() is only STABLE and cannot be used in a generated column.
--
-- Weights let the ranker prefer a title match over a body match:
--   A = title, B = summary/author, C = body.
--
-- Semantic search is deliberately not attempted here; it arrives in Etapa 11
-- on top of the `embeddings` table and complements, rather than replaces, this.
-- =============================================================================

alter table public.knowledge
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(content_text, '')), 'C')
  ) stored;

create index knowledge_search_vector_idx
  on public.knowledge using gin (search_vector);

alter table public.sources
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(content, '')), 'C')
  ) stored;

create index sources_search_vector_idx
  on public.sources using gin (search_vector);

-- Fuzzy title matching. `pg_trgm` lives in the `extensions` schema on Supabase,
-- so the operator class has to be qualified.
create index knowledge_title_trgm_idx
  on public.knowledge using gin (title extensions.gin_trgm_ops);

create index sources_title_trgm_idx
  on public.sources using gin (title extensions.gin_trgm_ops);

create index tags_name_trgm_idx
  on public.tags using gin (name extensions.gin_trgm_ops);

create index areas_name_trgm_idx
  on public.areas using gin (name extensions.gin_trgm_ops);
