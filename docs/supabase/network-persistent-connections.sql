-- Accepted collaboration requests represent persistent, private connections.
alter table public.ghost_collaboration_requests
  drop constraint ghost_collaboration_requests_status_check,
  add check (status in ('pending','accepted','declined','withdrawn','disconnected'));

-- Build the replacement first so duplicate live relationships fail safely.
create unique index ghost_collaboration_requests_live_pair
  on public.ghost_collaboration_requests(least(sender_profile_id,recipient_profile_id),greatest(sender_profile_id,recipient_profile_id))
  where status in ('pending','accepted');
drop index public.ghost_collaboration_requests_pending_pair;

create policy "active connected Ghosts can disconnect" on public.ghost_collaboration_requests for update to authenticated
  using ((select lgn_private.is_active_member()) and status='accepted' and (
    sender_profile_id in (select profile_id from public.ghost_profile_links)
    or recipient_profile_id in (select profile_id from public.ghost_profile_links)))
  with check ((select lgn_private.is_active_member()) and status='disconnected' and (
    sender_profile_id in (select profile_id from public.ghost_profile_links)
    or recipient_profile_id in (select profile_id from public.ghost_profile_links)));

-- Permissive RLS policies can combine their old-row and new-row conditions.
-- Keep disconnect transitions separate from pending-request decisions.
create function lgn_private.check_collaboration_disconnect()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  if (old.status='accepted' or new.status='disconnected')
    and (old.status<>'accepted' or new.status<>'disconnected') then
    raise exception 'Only an accepted connection can be disconnected' using errcode='23514';
  end if;
  return new;
end $fn$;
revoke all on function lgn_private.check_collaboration_disconnect() from public,anon,authenticated;
create trigger check_collaboration_disconnect_before_update
  before update of status on public.ghost_collaboration_requests
  for each row execute function lgn_private.check_collaboration_disconnect();
