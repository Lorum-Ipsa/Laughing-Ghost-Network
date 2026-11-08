-- Exported directly from the already-applied LGN development migration history.
-- DO NOT replay on the existing project. A clean CLI baseline is pending.

-- Handle presentation is case-preserving. Identity is case-insensitive.
-- Existing slash-containing handles are grandfathered, but new handles have
-- a narrower URL-safe alphabet. Previous reservations remain permanent.
begin;
alter table public.ghost_profiles
  drop constraint ghost_profiles_handle_check;
alter table public.ghost_profiles
  add constraint ghost_profiles_handle_check check (
    char_length(handle) between 3 and 40 and
    (handle ~ '^[A-Za-z0-9][A-Za-z0-9._!@#$&+~-]{2,39}$'
     or handle ~ '^[a-z0-9_/-]{3,40}$')
  );
create unique index ghost_profiles_handle_casefold_key
  on public.ghost_profiles ((lower(handle)));
create unique index reserved_handles_casefold_key
  on lgn_private.reserved_handles ((lower(handle)));
create or replace function lgn_private.reserve_profile_handle()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.handle !~ '^[A-Za-z0-9][A-Za-z0-9._!@#$&+~-]{2,39}$' then
    raise exception 'New handles must be 3-40 characters, begin with a letter or digit, and use only letters, digits, . _ - ! @ # $ & + ~'
      using errcode='23514';
  end if;
  insert into lgn_private.reserved_handles(handle,profile_id)
  values (new.handle,new.id);
  return new;
end $fn$;
revoke all on function lgn_private.reserve_profile_handle() from public,anon,authenticated;
commit;
