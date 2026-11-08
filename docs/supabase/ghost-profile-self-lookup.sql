-- Recorded Supabase remote migration 20261107205249_ghost_profile_self_lookup
-- Applied to lgn-development 2026-11-07; DO NOT replay on that project.
-- The initial identity foundation is still a separate unversioned snapshot.
begin;
create table public.ghost_profile_links (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null unique references public.ghost_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ghost_profile_links enable row level security;
revoke all on table public.ghost_profile_links from public, anon, authenticated;
grant select (profile_id) on public.ghost_profile_links to authenticated;
create policy "members can find only their own ghost profile"
  on public.ghost_profile_links for select to authenticated
  using (owner_id = (select auth.uid()));
create function lgn_private.link_new_ghost_profile()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  insert into public.ghost_profile_links (owner_id, profile_id)
  values (new.owner_id, new.id);
  return new;
end;
$fn$;
revoke all on function lgn_private.link_new_ghost_profile()
  from public, anon, authenticated;
create trigger link_new_ghost_profile
  after insert on public.ghost_profiles
  for each row execute function lgn_private.link_new_ghost_profile();
insert into public.ghost_profile_links(owner_id, profile_id)
select owner_id, id from public.ghost_profiles
on conflict do nothing;
commit;
