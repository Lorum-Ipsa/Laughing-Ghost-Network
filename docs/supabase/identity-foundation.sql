-- LGN / Supabase identity foundation (development schema snapshot).
-- Applied on 2026-11-07 to Supabase project oatdfrnytmliunauxqyd.
-- NOT a numbered Supabase CLI migration and NOT intended for reapplication
-- to that same project. Capture the remote baseline through the CLI before
-- using normal versioned migrations for subsequent changes.
begin;

create schema if not exists lgn_private;
revoke all on schema lgn_private from public, anon, authenticated;
grant usage on schema lgn_private to authenticated;

create table lgn_private.member_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'ghost'
    check (role in ('ghost', 'reviewer', 'moderator', 'admin')),
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table lgn_private.member_access enable row level security;
revoke all on lgn_private.member_access from public, anon, authenticated;

create table lgn_private.reserved_handles (
  handle text primary key,
  profile_id uuid not null unique,
  reserved_at timestamptz not null default now()
);
alter table lgn_private.reserved_handles enable row level security;
revoke all on lgn_private.reserved_handles from public, anon, authenticated;

create function lgn_private.is_active_member()
returns boolean
language sql stable security definer set search_path = ''
as $fn$
  select (select auth.uid()) is not null and exists (
    select 1 from lgn_private.member_access m
    where m.user_id = (select auth.uid()) and m.suspended = false
  );
$fn$;
revoke all on function lgn_private.is_active_member() from public, anon;
grant execute on function lgn_private.is_active_member() to authenticated;

create table public.ghost_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  handle text not null unique
    check (char_length(handle) between 3 and 40
      and handle ~ '^[a-z0-9_/-]+$'),
  display_name text not null default '' check (char_length(display_name) <= 100),
  pronouns text not null default '' check (char_length(pronouns) <= 40),
  bio text not null default '' check (char_length(bio) <= 2000),
  specialties text not null default '' check (char_length(specialties) <= 250),
  developing_specialties text not null default ''
    check (char_length(developing_specialties) <= 250),
  portfolio text not null default '' check (char_length(portfolio) <= 2048),
  location_disclosure text not null default 'undisclosed'
    check (location_disclosure in ('undisclosed', 'remote', 'country')),
  location_country text not null default '' check (char_length(location_country) <= 100),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lgn_disclose_location_only_if_chosen
    check (location_disclosure = 'country' or location_country = '')
);
create index ghost_profiles_handle_search_idx on public.ghost_profiles (handle);
alter table public.ghost_profiles enable row level security;

revoke all on public.ghost_profiles from public, anon, authenticated;
grant select (
  id, handle, display_name, pronouns, bio, specialties, developing_specialties,
  portfolio, location_disclosure, location_country, created_at, updated_at
) on public.ghost_profiles to anon, authenticated;
grant insert (
  owner_id, handle, display_name, pronouns, bio, specialties,
  developing_specialties, portfolio, location_disclosure, location_country
) on public.ghost_profiles to authenticated;
grant update (
  display_name, pronouns, bio, specialties, developing_specialties,
  portfolio, location_disclosure, location_country
) on public.ghost_profiles to authenticated;

create policy "anyone may read nondeleted public ghost profiles"
  on public.ghost_profiles for select to anon, authenticated
  using (deleted_at is null);
create policy "active member creates only own ghost profile"
  on public.ghost_profiles for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and deleted_at is null
    and (select lgn_private.is_active_member())
  );
create policy "active member edits only own public fields"
  on public.ghost_profiles for update to authenticated
  using (
    owner_id = (select auth.uid())
    and deleted_at is null
    and (select lgn_private.is_active_member())
  )
  with check (
    owner_id = (select auth.uid())
    and deleted_at is null
    and (select lgn_private.is_active_member())
  );

create table public.ghost_profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_translation_language text not null default 'en'
    check (char_length(preferred_translation_language) <= 30),
  preferred_publication_language text not null default 'en'
    check (char_length(preferred_publication_language) <= 30),
  always_show_original boolean not null default true,
  auto_translate boolean not null default false,
  never_translate_technical boolean not null default true,
  show_external_identities boolean not null default true,
  show_language_proficiency boolean not null default true,
  allow_recruiter_contact boolean not null default false,
  avatar_visibility text not null default 'public'
    check (avatar_visibility in ('public', 'members', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ghost_profile_preferences enable row level security;
revoke all on public.ghost_profile_preferences from public, anon, authenticated;
grant select on public.ghost_profile_preferences to authenticated;
grant update (
  preferred_translation_language, preferred_publication_language,
  always_show_original, auto_translate, never_translate_technical,
  show_external_identities, show_language_proficiency, allow_recruiter_contact,
  avatar_visibility
) on public.ghost_profile_preferences to authenticated;
create policy "only owner reads own preferences"
  on public.ghost_profile_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "active member edits own preferences"
  on public.ghost_profile_preferences for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select lgn_private.is_active_member())
  )
  with check (
    user_id = (select auth.uid())
    and (select lgn_private.is_active_member())
  );

create function lgn_private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;
revoke all on function lgn_private.touch_updated_at() from public, anon, authenticated;
create trigger touch_lgn_ghost_profiles before update on public.ghost_profiles
  for each row execute function lgn_private.touch_updated_at();
create trigger touch_lgn_preferences before update on public.ghost_profile_preferences
  for each row execute function lgn_private.touch_updated_at();
create trigger touch_lgn_member_access before update on lgn_private.member_access
  for each row execute function lgn_private.touch_updated_at();

create function lgn_private.reserve_profile_handle()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  insert into lgn_private.reserved_handles(handle, profile_id)
  values (new.handle, new.id);
  return new;
end;
$fn$;
revoke all on function lgn_private.reserve_profile_handle() from public, anon, authenticated;
create trigger reserve_new_ghost_handle after insert on public.ghost_profiles
  for each row execute function lgn_private.reserve_profile_handle();

create function lgn_private.on_auth_user_created()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  insert into lgn_private.member_access (user_id, role, suspended)
    values (new.id, 'ghost', false);
  insert into public.ghost_profile_preferences (user_id)
    values (new.id);
  return new;
end;
$fn$;
revoke all on function lgn_private.on_auth_user_created() from public, anon, authenticated;
create trigger lgn_after_auth_user_created
  after insert on auth.users
  for each row execute function lgn_private.on_auth_user_created();

commit;
