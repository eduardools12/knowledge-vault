-- =============================================================================
-- Knowledge Vault — fix ON DELETE SET NULL on composite foreign keys
-- =============================================================================
-- Bug: `ON DELETE SET NULL` on a *composite* foreign key nulls every column in
-- the key, not just the one pointing at the deleted row. Three FKs were
-- declared this way to make an optional link (an area, a parent area, an
-- inbox item's knowledge) survive the parent being removed:
--
--   areas_parent_fk         (user_id, parent_id)   -> areas (user_id, id)
--   knowledge_area_fk       (user_id, area_id)     -> areas (user_id, id)
--   inbox_items_knowledge_fk(user_id, knowledge_id)-> knowledge (user_id, id)
--
-- All three share `user_id` with the parent, since that is exactly what makes
-- cross-tenant references structurally impossible (see docs/architecture.md).
-- But `user_id` is also NOT NULL on the child table, and the SQL standard's
-- SET NULL action nulls *every* referencing column, `user_id` included. The
-- delete was therefore never survivable: it failed with a NOT NULL violation
-- the moment a referencing row existed, discovered when Etapa 4 first tried to
-- delete an area with knowledge filed under it.
--
-- Fix: drop SET NULL (falling back to the default NO ACTION) and null only the
-- foreign-key column itself with an explicit BEFORE DELETE trigger, the same
-- technique `areas_prevent_cycle` already uses for logic a plain constraint
-- cannot express. The trigger runs, and commits its UPDATE, before the row
-- delete proceeds, so by the time NO ACTION's own check runs there is nothing
-- left referencing the row being removed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- areas: children lose their parent, knowledge loses its area
-- -----------------------------------------------------------------------------
alter table public.areas drop constraint areas_parent_fk;
alter table public.areas
  add constraint areas_parent_fk
  foreign key (user_id, parent_id) references public.areas (user_id, id);

alter table public.knowledge drop constraint knowledge_area_fk;
alter table public.knowledge
  add constraint knowledge_area_fk
  foreign key (user_id, area_id) references public.areas (user_id, id);

create or replace function public.detach_area_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.areas
  set parent_id = null
  where user_id = old.user_id and parent_id = old.id;

  update public.knowledge
  set area_id = null
  where user_id = old.user_id and area_id = old.id;

  return old;
end;
$$;

create trigger areas_detach_references
  before delete on public.areas
  for each row execute function public.detach_area_references();

revoke execute on function public.detach_area_references() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- knowledge: inbox items lose their "became this knowledge" link
-- -----------------------------------------------------------------------------
alter table public.inbox_items drop constraint inbox_items_knowledge_fk;
alter table public.inbox_items
  add constraint inbox_items_knowledge_fk
  foreign key (user_id, knowledge_id) references public.knowledge (user_id, id);

create or replace function public.detach_inbox_item_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.inbox_items
  set knowledge_id = null
  where user_id = old.user_id and knowledge_id = old.id;

  return old;
end;
$$;

create trigger knowledge_detach_inbox_references
  before delete on public.knowledge
  for each row execute function public.detach_inbox_item_references();

revoke execute on function public.detach_inbox_item_references() from public, anon, authenticated;
