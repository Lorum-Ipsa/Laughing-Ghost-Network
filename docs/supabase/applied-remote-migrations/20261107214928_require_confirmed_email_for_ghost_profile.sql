-- Exported from lgn-development remote Supabase migration history, 2026-11-07.
-- ALREADY APPLIED to that project. DO NOT replay on its existing database.
-- Historical source record: a clean CLI baseline has not been established.

create or replace function lgn_private.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $fn$
  select (select auth.uid()) is not null and exists (
    select 1
    from lgn_private.member_access as m
    join auth.users as u on u.id = m.user_id
    where m.user_id = (select auth.uid())
      and m.suspended = false
      and u.email_confirmed_at is not null
      and u.deleted_at is null
  );
$fn$;
