-- =============================================================================
-- Knowledge Vault — core schema
-- =============================================================================
-- Tenant isolation strategy
-- -------------------------
-- Every user-owned table carries a denormalised `user_id` and a redundant
-- `unique (user_id, id)` key. Child tables then reference their parent through
-- a COMPOSITE foreign key `(user_id, parent_id) -> parent (user_id, id)`.
--
-- This makes cross-tenant references structurally impossible: a row can never
-- point at a row owned by somebody else, even if application code or an RLS
-- policy is wrong. RLS is then the second line of defence, not the only one.
--
-- Nullable composite FKs use the default MATCH SIMPLE semantics, so the
-- constraint is simply skipped when the child column is NULL.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — public mirror of auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  locale        text        not null default 'pt-BR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80)
);

comment on table public.profiles is
  'Application-level user data. Mirrors auth.users, created by a trigger on signup.';

-- -----------------------------------------------------------------------------
-- areas — broad categories, optionally nested
-- -----------------------------------------------------------------------------
create table public.areas (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  parent_id   uuid,
  name        text        not null,
  slug        text        not null,
  description text,
  color       text,
  icon        text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint areas_user_id_id_key unique (user_id, id),
  constraint areas_user_id_slug_key unique (user_id, slug),
  constraint areas_parent_fk
    foreign key (user_id, parent_id) references public.areas (user_id, id)
    on delete set null,
  constraint areas_not_own_parent check (parent_id is distinct from id),
  constraint areas_name_length check (char_length(trim(name)) between 1 and 80),
  constraint areas_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint areas_color_format check (color is null or color ~ '^#[0-9a-fA-F]{6}$')
);

create index areas_user_id_idx on public.areas (user_id);
create index areas_parent_id_idx on public.areas (parent_id) where parent_id is not null;

-- -----------------------------------------------------------------------------
-- tags — fine-grained, free-form labels
-- -----------------------------------------------------------------------------
create table public.tags (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  slug       text        not null,
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tags_user_id_id_key unique (user_id, id),
  constraint tags_user_id_slug_key unique (user_id, slug),
  constraint tags_name_length check (char_length(trim(name)) between 1 and 50),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tags_color_format check (color is null or color ~ '^#[0-9a-fA-F]{6}$')
);

create index tags_user_id_idx on public.tags (user_id);

-- -----------------------------------------------------------------------------
-- sources — where a piece of knowledge came from
-- -----------------------------------------------------------------------------
create table public.sources (
  id           uuid               primary key default gen_random_uuid(),
  user_id      uuid               not null references auth.users (id) on delete cascade,
  title        text               not null,
  type         public.source_type not null default 'other',
  url          text,
  author       text,
  description  text,
  -- Extracted or pasted full text. Feeds search and, later, embeddings.
  content      text,
  -- Object key inside the private `vault` Storage bucket, when a file is attached.
  storage_path text,
  published_at date,
  created_at   timestamptz        not null default now(),
  updated_at   timestamptz        not null default now(),

  constraint sources_user_id_id_key unique (user_id, id),
  constraint sources_title_length check (char_length(trim(title)) between 1 and 300),
  constraint sources_url_format check (url is null or url ~* '^https?://')
);

create index sources_user_id_created_at_idx on public.sources (user_id, created_at desc);
create index sources_user_id_type_idx on public.sources (user_id, type);

-- -----------------------------------------------------------------------------
-- projects — where knowledge is actually applied
-- -----------------------------------------------------------------------------
create table public.projects (
  id          uuid                  primary key default gen_random_uuid(),
  user_id     uuid                  not null references auth.users (id) on delete cascade,
  name        text                  not null,
  slug        text                  not null,
  description text,
  status      public.project_status not null default 'idea',
  started_at  date,
  ended_at    date,
  created_at  timestamptz           not null default now(),
  updated_at  timestamptz           not null default now(),

  constraint projects_user_id_id_key unique (user_id, id),
  constraint projects_user_id_slug_key unique (user_id, slug),
  constraint projects_name_length check (char_length(trim(name)) between 1 and 120),
  constraint projects_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint projects_date_order
    check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index projects_user_id_status_idx on public.projects (user_id, status);

-- -----------------------------------------------------------------------------
-- knowledge — the central entity
-- -----------------------------------------------------------------------------
create table public.knowledge (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid,

  title   text not null,
  summary text,

  -- Rich-text document produced by the editor (Etapa 3). Stored as JSONB so new
  -- block types can be introduced without a migration.
  content      jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  -- Flattened plain-text mirror of `content`, written by the application on
  -- every save. Single input for full-text search and, later, embeddings.
  content_text text  not null default '',

  level  public.knowledge_level  not null default 'discovered',
  status public.knowledge_status not null default 'draft',

  -- Kept in sync with `status` by a trigger; never written by the application.
  archived_at timestamptz,

  -- Spaced-repetition fields. Actually driven from Etapa 14 onwards; the
  -- columns exist now so review history is not lost in the meantime.
  last_reviewed_at timestamptz,
  next_review_at   timestamptz,
  review_count     integer  not null default 0,
  difficulty       smallint,
  confidence       smallint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint knowledge_user_id_id_key unique (user_id, id),
  constraint knowledge_area_fk
    foreign key (user_id, area_id) references public.areas (user_id, id)
    on delete set null,
  constraint knowledge_title_length check (char_length(trim(title)) between 1 and 300),
  constraint knowledge_summary_length check (summary is null or char_length(summary) <= 2000),
  constraint knowledge_review_count_positive check (review_count >= 0),
  constraint knowledge_difficulty_range check (difficulty is null or difficulty between 1 and 5),
  constraint knowledge_confidence_range check (confidence is null or confidence between 1 and 5),
  constraint knowledge_archived_at_matches_status
    check ((status = 'archived') = (archived_at is not null))
);

create index knowledge_user_id_updated_at_idx on public.knowledge (user_id, updated_at desc);
create index knowledge_user_id_created_at_idx on public.knowledge (user_id, created_at desc);
create index knowledge_user_id_status_idx on public.knowledge (user_id, status);
create index knowledge_user_id_level_idx on public.knowledge (user_id, level);
create index knowledge_area_id_idx on public.knowledge (area_id) where area_id is not null;
create index knowledge_next_review_at_idx
  on public.knowledge (user_id, next_review_at)
  where next_review_at is not null and status <> 'archived';
