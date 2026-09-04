-- =============================================================================
-- Knowledge Vault — index alignment and EXECUTE hardening
-- =============================================================================
-- Two corrections found by the Supabase advisors after the initial schema was
-- applied. Both are cheap now and expensive once the vault holds data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Indexes must match the composite foreign keys
-- -----------------------------------------------------------------------------
-- The tenant-isolation design references parents by `(user_id, parent_id)`, but
-- the first pass indexed only the single id column. A composite FK is checked
-- and cascaded on *both* columns in order, so a single-column index does not
-- cover it: deleting one knowledge record would sequentially scan every child
-- table.
--
-- The replacement indexes lead with `user_id`, which is also what every query
-- filters on — RLS appends `user_id = auth.uid()` to all of them. So one index
-- now serves the foreign key, the cascade and the read path, and the separate
-- single-column indexes it replaces become dead weight.

-- areas: parent hierarchy
drop index if exists public.areas_user_id_idx;
drop index if exists public.areas_parent_id_idx;
create index areas_user_id_parent_id_idx on public.areas (user_id, parent_id);

-- knowledge: area assignment
drop index if exists public.knowledge_area_id_idx;
create index knowledge_user_id_area_id_idx on public.knowledge (user_id, area_id);

-- knowledge_tags
drop index if exists public.knowledge_tags_user_id_idx;
drop index if exists public.knowledge_tags_tag_id_idx;
create index knowledge_tags_user_id_knowledge_id_idx
  on public.knowledge_tags (user_id, knowledge_id);
create index knowledge_tags_user_id_tag_id_idx
  on public.knowledge_tags (user_id, tag_id);

-- source_tags
drop index if exists public.source_tags_user_id_idx;
drop index if exists public.source_tags_tag_id_idx;
create index source_tags_user_id_source_id_idx on public.source_tags (user_id, source_id);
create index source_tags_user_id_tag_id_idx on public.source_tags (user_id, tag_id);

-- knowledge_sources
drop index if exists public.knowledge_sources_user_id_idx;
drop index if exists public.knowledge_sources_source_id_idx;
create index knowledge_sources_user_id_knowledge_id_idx
  on public.knowledge_sources (user_id, knowledge_id);
create index knowledge_sources_user_id_source_id_idx
  on public.knowledge_sources (user_id, source_id);

-- knowledge_projects
drop index if exists public.knowledge_projects_user_id_idx;
drop index if exists public.knowledge_projects_project_id_idx;
create index knowledge_projects_user_id_knowledge_id_idx
  on public.knowledge_projects (user_id, knowledge_id);
create index knowledge_projects_user_id_project_id_idx
  on public.knowledge_projects (user_id, project_id);

-- knowledge_relations: both directions of every graph edge
drop index if exists public.knowledge_relations_user_id_idx;
drop index if exists public.knowledge_relations_from_id_idx;
drop index if exists public.knowledge_relations_to_id_idx;
create index knowledge_relations_user_id_from_id_idx
  on public.knowledge_relations (user_id, from_id);
create index knowledge_relations_user_id_to_id_idx
  on public.knowledge_relations (user_id, to_id);

-- inbox_items: link back to what an item became
drop index if exists public.inbox_items_knowledge_id_idx;
create index inbox_items_user_id_knowledge_id_idx
  on public.inbox_items (user_id, knowledge_id);

-- reviews: the trailing `reviewed_at` also serves the history query on a
-- knowledge page, so this one index replaces two.
drop index if exists public.reviews_knowledge_id_reviewed_at_idx;
create index reviews_user_id_knowledge_id_reviewed_at_idx
  on public.reviews (user_id, knowledge_id, reviewed_at desc);

-- -----------------------------------------------------------------------------
-- 2. Trigger functions must not be callable through the API
-- -----------------------------------------------------------------------------
-- PostgREST exposes the `public` schema, and functions there inherit EXECUTE
-- for `anon` and `authenticated` by default. These are trigger functions: they
-- have no business being reachable at `/rest/v1/rpc/...`.
--
-- It matters most for the two SECURITY DEFINER ones, which run as the table
-- owner and therefore bypass RLS. Postgres does refuse to call a trigger
-- function directly, so this is defence in depth rather than an open hole — but
-- an exposed SECURITY DEFINER function is exactly the shape of a privilege
-- escalation bug, and there is no reason to leave one reachable.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.delete_orphaned_embeddings() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.sync_knowledge_archived_at() from anon, authenticated, public;
revoke execute on function public.sync_inbox_processed_at() from anon, authenticated, public;
revoke execute on function public.apply_review_to_knowledge() from anon, authenticated, public;
