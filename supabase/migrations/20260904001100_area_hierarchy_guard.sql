-- =============================================================================
-- Knowledge Vault — cycle guard for the area hierarchy
-- =============================================================================
-- `areas.parent_id` already refuses to point at its own row, and the composite
-- foreign key refuses to point at another user's area. Neither stops a longer
-- loop: A parented to B, then B parented to A.
--
-- A cycle is not a data curiosity here. Every consumer of this table walks it —
-- the parent picker, the breadcrumb on an area page, and later the knowledge
-- graph — and each of those walks would run until it ran out of stack.
--
-- Application code could check this before every write, but it would be one
-- check per write path, and the one that gets forgotten is the one that
-- corrupts the tree. The database is where the invariant belongs.
-- =============================================================================

create or replace function public.prevent_area_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ancestor uuid := new.parent_id;
  hops int := 0;
begin
  if new.parent_id is null then
    return new;
  end if;

  -- Walk up from the proposed parent. Reaching the row being edited means the
  -- new edge would close a loop.
  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'Uma área não pode ser descendente de si mesma.'
        using errcode = 'check_violation';
    end if;

    hops := hops + 1;

    -- Belt and braces: if a cycle somehow already exists in stored data, this
    -- stops the walk from hanging the transaction that discovered it.
    if hops > 50 then
      raise exception 'Hierarquia de áreas profunda demais.'
        using errcode = 'check_violation';
    end if;

    select parent_id into ancestor from public.areas where id = ancestor;
  end loop;

  return new;
end;
$$;

create trigger areas_prevent_cycle
  before insert or update of parent_id on public.areas
  for each row execute function public.prevent_area_cycle();

revoke execute on function public.prevent_area_cycle() from public, anon, authenticated;
