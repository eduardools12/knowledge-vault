-- =============================================================================
-- Knowledge Vault — relationship tables
-- =============================================================================
-- These tables are what turn the vault into a graph rather than a list.
-- Every one of them carries `user_id` and uses composite foreign keys, so a
-- link between two rows owned by different users cannot be created at all.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- knowledge <-> tags
-- -----------------------------------------------------------------------------
create table public.knowledge_tags (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  knowledge_id uuid        not null,
  tag_id       uuid        not null,
  created_at   timestamptz not null default now(),

  constraint knowledge_tags_pkey primary key (knowledge_id, tag_id),
  constraint knowledge_tags_knowledge_fk
    foreign key (user_id, knowledge_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint knowledge_tags_tag_fk
    foreign key (user_id, tag_id) references public.tags (user_id, id)
    on delete cascade
);

create index knowledge_tags_tag_id_idx on public.knowledge_tags (tag_id);
create index knowledge_tags_user_id_idx on public.knowledge_tags (user_id);

-- -----------------------------------------------------------------------------
-- sources <-> tags
-- -----------------------------------------------------------------------------
create table public.source_tags (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  source_id  uuid        not null,
  tag_id     uuid        not null,
  created_at timestamptz not null default now(),

  constraint source_tags_pkey primary key (source_id, tag_id),
  constraint source_tags_source_fk
    foreign key (user_id, source_id) references public.sources (user_id, id)
    on delete cascade,
  constraint source_tags_tag_fk
    foreign key (user_id, tag_id) references public.tags (user_id, id)
    on delete cascade
);

create index source_tags_tag_id_idx on public.source_tags (tag_id);
create index source_tags_user_id_idx on public.source_tags (user_id);

-- -----------------------------------------------------------------------------
-- knowledge <-> sources
-- -----------------------------------------------------------------------------
create table public.knowledge_sources (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  knowledge_id uuid        not null,
  source_id    uuid        not null,
  -- Why this source matters for this knowledge (page, timestamp, quote...).
  note         text,
  created_at   timestamptz not null default now(),

  constraint knowledge_sources_pkey primary key (knowledge_id, source_id),
  constraint knowledge_sources_knowledge_fk
    foreign key (user_id, knowledge_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint knowledge_sources_source_fk
    foreign key (user_id, source_id) references public.sources (user_id, id)
    on delete cascade,
  constraint knowledge_sources_note_length check (note is null or char_length(note) <= 1000)
);

create index knowledge_sources_source_id_idx on public.knowledge_sources (source_id);
create index knowledge_sources_user_id_idx on public.knowledge_sources (user_id);

-- -----------------------------------------------------------------------------
-- knowledge <-> knowledge (the knowledge graph edge table)
-- -----------------------------------------------------------------------------
-- Directional: `from_id --type--> to_id` reads "from depends_on to".
-- The UI renders the inverse direction on the target page, so a single row is
-- enough to describe both sides of a relationship.
create table public.knowledge_relations (
  id         uuid                 primary key default gen_random_uuid(),
  user_id    uuid                 not null references auth.users (id) on delete cascade,
  from_id    uuid                 not null,
  to_id      uuid                 not null,
  type       public.relation_type not null default 'related_to',
  note       text,
  created_at timestamptz          not null default now(),

  constraint knowledge_relations_unique unique (from_id, to_id, type),
  constraint knowledge_relations_no_self_link check (from_id <> to_id),
  constraint knowledge_relations_from_fk
    foreign key (user_id, from_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint knowledge_relations_to_fk
    foreign key (user_id, to_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint knowledge_relations_note_length check (note is null or char_length(note) <= 1000)
);

create index knowledge_relations_from_id_idx on public.knowledge_relations (from_id);
create index knowledge_relations_to_id_idx on public.knowledge_relations (to_id);
create index knowledge_relations_user_id_idx on public.knowledge_relations (user_id);

comment on table public.knowledge_relations is
  'Edges of the knowledge graph. Traversed by the graph view (Etapa 13) and used '
  'to build context for RAG answers (Etapa 12).';

-- -----------------------------------------------------------------------------
-- knowledge <-> projects
-- -----------------------------------------------------------------------------
create table public.knowledge_projects (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  knowledge_id uuid        not null,
  project_id   uuid        not null,
  -- How the knowledge was applied in this project.
  note         text,
  created_at   timestamptz not null default now(),

  constraint knowledge_projects_pkey primary key (knowledge_id, project_id),
  constraint knowledge_projects_knowledge_fk
    foreign key (user_id, knowledge_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint knowledge_projects_project_fk
    foreign key (user_id, project_id) references public.projects (user_id, id)
    on delete cascade,
  constraint knowledge_projects_note_length check (note is null or char_length(note) <= 1000)
);

create index knowledge_projects_project_id_idx on public.knowledge_projects (project_id);
create index knowledge_projects_user_id_idx on public.knowledge_projects (user_id);

-- -----------------------------------------------------------------------------
-- inbox_items — fast capture, organised later
-- -----------------------------------------------------------------------------
create table public.inbox_items (
  id           uuid                primary key default gen_random_uuid(),
  user_id      uuid                not null references auth.users (id) on delete cascade,
  kind         public.inbox_kind   not null default 'note',
  status       public.inbox_status not null default 'unprocessed',
  title        text,
  url          text,
  content      text,
  storage_path text,
  note         text,
  -- Set when the item is turned into structured knowledge, so the capture
  -- keeps a trace of what it became.
  knowledge_id uuid,
  processed_at timestamptz,
  created_at   timestamptz         not null default now(),
  updated_at   timestamptz         not null default now(),

  constraint inbox_items_user_id_id_key unique (user_id, id),
  constraint inbox_items_knowledge_fk
    foreign key (user_id, knowledge_id) references public.knowledge (user_id, id)
    on delete set null,
  constraint inbox_items_url_format check (url is null or url ~* '^https?://'),
  constraint inbox_items_title_length
    check (title is null or char_length(trim(title)) between 1 and 300),
  -- An item must carry at least something worth keeping.
  constraint inbox_items_has_payload
    check (title is not null or url is not null or content is not null or storage_path is not null),
  constraint inbox_items_processed_at_matches_status
    check ((status = 'processed') = (processed_at is not null))
);

create index inbox_items_user_id_status_idx on public.inbox_items (user_id, status, created_at desc);
create index inbox_items_knowledge_id_idx on public.inbox_items (knowledge_id) where knowledge_id is not null;

-- -----------------------------------------------------------------------------
-- reviews — append-only log of knowledge revisions
-- -----------------------------------------------------------------------------
-- The aggregate counters on `knowledge` are derived from this log by a trigger,
-- so the history stays auditable and the hot path stays a single-row read.
create table public.reviews (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  knowledge_id   uuid        not null,
  reviewed_at    timestamptz not null default now(),
  previous_level public.knowledge_level,
  new_level      public.knowledge_level,
  difficulty     smallint,
  confidence     smallint,
  next_review_at timestamptz,
  note           text,

  constraint reviews_knowledge_fk
    foreign key (user_id, knowledge_id) references public.knowledge (user_id, id)
    on delete cascade,
  constraint reviews_difficulty_range check (difficulty is null or difficulty between 1 and 5),
  constraint reviews_confidence_range check (confidence is null or confidence between 1 and 5),
  constraint reviews_note_length check (note is null or char_length(note) <= 2000)
);

create index reviews_knowledge_id_reviewed_at_idx on public.reviews (knowledge_id, reviewed_at desc);
create index reviews_user_id_reviewed_at_idx on public.reviews (user_id, reviewed_at desc);
