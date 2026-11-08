-- Directly exported from already-applied LGN development Supabase migration history.
-- DO NOT replay on the initialized project. A clean CLI baseline remains pending.

begin;
alter table public.ghost_profiles drop constraint ghost_profiles_handle_check;
alter table public.ghost_profiles add constraint ghost_profiles_handle_check
check (char_length(handle) between 3 and 40 and
  ((handle ~ '^[A-Za-z0-9][A-Za-z0-9._!@#$&+~/-]{2,39}$'
    and replace(handle,'//','') !~ '/'
    and position('///' in handle)=0)
   or handle ~ '^[a-z0-9_/-]{3,40}$'));
create or replace function lgn_private.reserve_profile_handle()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.handle !~ '^[A-Za-z0-9][A-Za-z0-9._!@#$&+~/-]{2,39}$'
     or replace(new.handle,'//','') ~ '/'
     or position('///' in new.handle)>0
     or char_length(new.handle) not between 3 and 40 then
    raise exception 'Handle requires 3-40 characters, a letter or digit first, and only approved punctuation; slash is permitted only as //'
      using errcode='23514';
  end if;
  insert into lgn_private.reserved_handles(handle,profile_id)
  values(new.handle,new.id);
  return new;
end $fn$;
revoke all on function lgn_private.reserve_profile_handle() from public,anon,authenticated;
commit;
