-- Exported from lgn-development remote Supabase migration history, 2026-11-07.
-- ALREADY APPLIED to that project. DO NOT replay on its existing database.
-- Historical source record: a clean CLI baseline has not been established.

-- Fix contribution INSERT policy to use the authenticated member's RLS-scoped
-- profile link, without querying the deliberately private owner_id column.
begin;
drop policy "confirmed member creates own contribution" on public.ghost_contributions;
create policy "confirmed member creates own contribution"
 on public.ghost_contributions for insert to authenticated
 with check (
  owner_id=(select auth.uid())
  and deleted_at is null
  and (select lgn_private.is_active_member())
  and profile_id in (
    select profile_id from public.ghost_profile_links
  )
 );
commit;
