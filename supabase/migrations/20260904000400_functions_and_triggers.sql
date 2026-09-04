-- =============================================================================
-- Knowledge Vault — functions and triggers
-- =============================================================================
-- Every function pins `search_path` to the empty string and fully qualifies the
-- objects it touches. Without this a function is resolvable through a caller
-- controlled search_path, which is a privilege-escalation vector for the
-- SECURITY DEFINER ones. All identifiers below are therefore schema-qualified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger knowledge_set_updated_at
  before update on public.knowledge
  for each row execute function public.set_updated_at();

create trigger inbox_items_set_updated_at
  before update on public.inbox_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profile bootstrap on signup
-- -----------------------------------------------------------------------------
-- Runs as the trigger owner because the signup transaction is executed by the
-- auth service, which has no rights on `public`. `on conflict do nothing` keeps
-- signup from failing if a profile somehow already exists — a failure here
-- would roll back the whole account creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Derived timestamp columns
-- -----------------------------------------------------------------------------
-- `archived_at` is a function of `status`, so the application only ever sets
-- `status` and the constraint linking the two can never be violated.
create or replace function public.sync_knowledge_archived_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'archived' then
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;

  return new;
end;
$$;

create trigger knowledge_sync_archived_at
  before insert or update on public.knowledge
  for each row execute function public.sync_knowledge_archived_at();

create or replace function public.sync_inbox_processed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'processed' then
    new.processed_at := coalesce(new.processed_at, now());
  else
    new.processed_at := null;
  end if;

  return new;
end;
$$;

create trigger inbox_items_sync_processed_at
  before insert or update on public.inbox_items
  for each row execute function public.sync_inbox_processed_at();

-- -----------------------------------------------------------------------------
-- Review roll-up
-- -----------------------------------------------------------------------------
-- `reviews` is the append-only source of truth; the counters on `knowledge`
-- are a cache so the knowledge page stays a single-row read. Not SECURITY
-- DEFINER on purpose: the caller owns both rows, so the ordinary RLS update
-- policy is expected to pass and still applies.
create or replace function public.apply_review_to_knowledge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.knowledge
  set
    last_reviewed_at = new.reviewed_at,
    next_review_at   = new.next_review_at,
    review_count     = knowledge.review_count + 1,
    difficulty       = coalesce(new.difficulty, knowledge.difficulty),
    confidence       = coalesce(new.confidence, knowledge.confidence),
    level            = coalesce(new.new_level, knowledge.level)
  where knowledge.id = new.knowledge_id;

  return new;
end;
$$;

create trigger reviews_apply_to_knowledge
  after insert on public.reviews
  for each row execute function public.apply_review_to_knowledge();
