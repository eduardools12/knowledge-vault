-- =============================================================================
-- Knowledge Vault — Row Level Security
-- =============================================================================
-- Model: every row belongs to exactly one user and is reachable only by that
-- user. There is no sharing, no roles and no public data in the MVP, so a
-- single ownership predicate covers the whole schema.
--
-- The predicate is written `(select auth.uid()) = user_id` rather than
-- `auth.uid() = user_id`. Wrapping the call in a subquery lets Postgres
-- evaluate it once as an InitPlan instead of once per row, which matters as
-- soon as a table holds more than a few thousand rows.
--
-- The policies are generated from the explicit table list below: the list is
-- what gets reviewed, and generating from it removes any chance of a
-- copy-paste mistake leaving one table open.
-- =============================================================================

do $$
declare
  target_table text;
  owned_tables constant text[] := array[
    'areas',
    'tags',
    'sources',
    'projects',
    'knowledge',
    'knowledge_tags',
    'source_tags',
    'knowledge_sources',
    'knowledge_relations',
    'knowledge_projects',
    'inbox_items',
    'reviews'
  ];
begin
  foreach target_table in array owned_tables loop
    execute format('alter table public.%I enable row level security', target_table);

    -- `anon` must never reach application data. RLS already blocks it because
    -- every policy targets `authenticated`, but removing the grant means an
    -- accidentally permissive policy still cannot expose anything pre-login.
    execute format('revoke all on public.%I from anon', target_table);

    -- Granted explicitly rather than relying on Supabase's default privileges.
    -- Those defaults normally cover new tables in `public`, but a schema that
    -- silently depends on them breaks in any environment where they were
    -- changed — and the failure mode is every query returning "permission
    -- denied" after deploy. Table privileges only open the door; RLS still
    -- decides which rows come back.
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      target_table
    );

    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)',
      target_table || '_select_own', target_table
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)',
      target_table || '_insert_own', target_table
    );

    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      target_table || '_update_own', target_table
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)',
      target_table || '_delete_own', target_table
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — keyed on `id` (it is the auth.users id), so handled separately
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT or DELETE policy by design. Profiles are created by the
-- `handle_new_user` trigger (SECURITY DEFINER, so it bypasses RLS as the table
-- owner) and removed by the `on delete cascade` from auth.users. A client can
-- therefore never fabricate or orphan a profile row.
