-- =============================================================================
-- Knowledge Vault — dashboard summary
-- =============================================================================
-- The dashboard needs a dozen aggregates at once. Fetching them through
-- PostgREST would mean a dozen round trips from the browser to São Paulo, and
-- two of them ("knowledge with no source attached", "busiest area this week")
-- are anti-joins and group-bys that PostgREST cannot express cleanly anyway.
--
-- One function, one round trip, and the awkward queries stay in SQL where they
-- are readable.
--
-- SECURITY INVOKER (the default, stated here because it is load-bearing): the
-- function runs as the caller, so every SELECT inside it is still filtered by
-- Row Level Security. A SECURITY DEFINER version would silently aggregate the
-- whole table across all users — the exact bug this project is designed to make
-- impossible. There is no `where user_id = ...` below on purpose: RLS adds it,
-- and duplicating it here would suggest the policy is optional.
-- =============================================================================

create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with active as (
    select * from public.knowledge where status <> 'archived'
  )
  select jsonb_build_object(
    -- Headline counts
    'knowledge_total',    (select count(*) from active),
    'knowledge_archived', (select count(*) from public.knowledge where status = 'archived'),
    'sources_total',      (select count(*) from public.sources),
    'areas_total',        (select count(*) from public.areas),
    'tags_total',         (select count(*) from public.tags),
    'projects_active',    (select count(*) from public.projects where status = 'active'),
    'relations_total',    (select count(*) from public.knowledge_relations),

    -- Things asking for attention
    'inbox_unprocessed', (
      select count(*) from public.inbox_items where status in ('unprocessed', 'in_review')
    ),
    'needs_review', (
      select count(*) from active where next_review_at is not null and next_review_at <= now()
    ),

    -- Knowledge with nothing backing it up. An anti-join, which is why this
    -- lives in SQL rather than being assembled client-side.
    'without_sources', (
      select count(*)
      from active k
      where not exists (
        select 1 from public.knowledge_sources ks where ks.knowledge_id = k.id
      )
    ),

    -- Activity over the last seven days
    'added_this_week',   (select count(*) from active where created_at >= now() - interval '7 days'),
    'updated_this_week', (
      select count(*) from active
      where updated_at >= now() - interval '7 days'
        and updated_at > created_at
    ),

    -- Distribution across maturity levels, as {level: count}. Levels with no
    -- rows are simply absent; the UI fills in the zeros so a new value added to
    -- the enum cannot crash the page.
    'by_level', coalesce(
      (
        select jsonb_object_agg(level, total)
        from (select level, count(*) as total from active group by level) counted
      ),
      '{}'::jsonb
    ),

    -- Where the effort went this week, or null when nothing was touched.
    'top_area_this_week', (
      select jsonb_build_object('id', a.id, 'name', a.name, 'total', count(*))
      from active k
      join public.areas a on a.id = k.area_id
      where k.updated_at >= now() - interval '7 days'
      group by a.id, a.name
      order by count(*) desc, a.name asc
      limit 1
    )
  );
$$;

comment on function public.dashboard_summary() is
  'Aggregates for the dashboard in a single call. SECURITY INVOKER so Row Level Security still scopes every count to the caller.';

-- Reachable by signed-in users through /rest/v1/rpc/dashboard_summary, which is
-- the point. `anon` has no business calling it: with no session there is
-- nothing to count, and leaving it exposed only widens the pre-login surface.
revoke execute on function public.dashboard_summary() from public, anon;
grant execute on function public.dashboard_summary() to authenticated;
