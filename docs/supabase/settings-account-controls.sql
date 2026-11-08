-- Phase 1 account controls. Deactivation disables private access and writes
-- while preserving published work, attribution and moderation records.
alter table lgn_private.member_access add column deactivated_at timestamptz;

create function lgn_private.ghost_account_state()
returns text language sql stable security definer set search_path='' as $fn$
  select case
    when (select auth.uid()) is null then 'signed_out'
    when exists (select 1 from lgn_private.member_access m
      where m.user_id=(select auth.uid()) and m.deactivated_at is not null) then 'deactivated'
    when coalesce((select auth.jwt())->>'aal','aal1')<>'aal2'
      and exists (select 1 from auth.mfa_factors f
        where f.user_id=(select auth.uid()) and f.status='verified') then 'mfa_required'
    else 'active'
  end;
$fn$;
revoke all on function lgn_private.ghost_account_state() from public,anon,authenticated;
grant execute on function lgn_private.ghost_account_state() to authenticated;

create function public.ghost_account_state()
returns text language sql stable security invoker set search_path='' as $fn$
  select lgn_private.ghost_account_state();
$fn$;
revoke all on function public.ghost_account_state() from public,anon,authenticated;
grant execute on function public.ghost_account_state() to authenticated;

create or replace function lgn_private.is_active_member()
returns boolean language sql stable security definer set search_path='' as $fn$
  select (select lgn_private.ghost_account_state())='active' and exists (
    select 1 from lgn_private.member_access m join auth.users u on u.id=m.user_id
    where m.user_id=(select auth.uid()) and not m.suspended
      and u.email_confirmed_at is not null and u.deleted_at is null
  );
$fn$;
create or replace function lgn_private.can_review_contributions()
returns boolean language sql stable security definer set search_path='' as $fn$
  select (select lgn_private.is_active_member()) and exists (
    select 1 from lgn_private.member_access m
    where m.user_id=(select auth.uid()) and m.role in ('reviewer','moderator','admin')
  );
$fn$;

-- Also protect direct Data API reads that previously required ownership only.
-- Anonymous public readers still use the existing publication policies.
do $guard$
declare target text;
begin
  foreach target in array array[
    'ghost_collaboration_requests','ghost_contribution_reports','ghost_contribution_reviews',
    'ghost_contribution_revisions','ghost_contribution_text_attachments','ghost_contribution_translations',
    'ghost_contribution_triage','ghost_contributions','ghost_direct_messages','ghost_dm_identity_keys',
    'ghost_dm_threads','ghost_follows','ghost_notification_preferences','ghost_notifications',
    'ghost_profile_links','ghost_profile_preferences','ghost_profiles','ghost_project_members',
    'ghost_project_milestones','ghost_project_roles','ghost_project_tasks','ghost_project_updates',
    'ghost_project_watches','ghost_projects','ghost_push_subscriptions','ghost_saved_searches',
    'ghost_table_talk_debriefs','ghost_table_talk_decisions','ghost_table_talk_materials',
    'ghost_table_talk_members','ghost_table_talks'
  ] loop
    execute format('create policy "active account session required" on public.%I as restrictive for all to authenticated using ((select lgn_private.ghost_account_state()) = ''active'') with check ((select lgn_private.ghost_account_state()) = ''active'')',target);
  end loop;
end $guard$;

create function public.export_ghost_account()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare
  account_id uuid:=(select auth.uid());
  ghost_id uuid;
begin
  if not lgn_private.is_active_member() then
    raise exception 'An active verified account session is required' using errcode='42501';
  end if;
  select profile_id into ghost_id from public.ghost_profile_links where owner_id=account_id;
  return jsonb_build_object(
    'export_version',1,'exported_at',now(),
    'account',(select jsonb_build_object('email',u.email,'created_at',u.created_at) from auth.users u where u.id=account_id),
    'profile',(select to_jsonb(g)-'owner_id' from public.ghost_profiles g where g.id=ghost_id),
    'profile_preferences',(select to_jsonb(p)-'user_id' from public.ghost_profile_preferences p where p.user_id=account_id),
    'notification_preferences',(select to_jsonb(p) from public.ghost_notification_preferences p where p.profile_id=ghost_id),
    'contributions',coalesce((select jsonb_agg(to_jsonb(c)-'owner_id' order by c.created_at) from public.ghost_contributions c where c.owner_id=account_id),'[]'::jsonb),
    'contribution_revisions',coalesce((select jsonb_agg(to_jsonb(r)-'owner_id' order by r.created_at) from public.ghost_contribution_revisions r where r.owner_id=account_id),'[]'::jsonb),
    'projects',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.ghost_projects p where p.profile_id=ghost_id),'[]'::jsonb),
    'table_talks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.ghost_table_talks t where t.profile_id=ghost_id),'[]'::jsonb),
    'table_talk_decisions',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from public.ghost_table_talk_decisions d where d.profile_id=ghost_id),'[]'::jsonb),
    'saved_searches',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.ghost_saved_searches s where s.profile_id=ghost_id),'[]'::jsonb),
    'follows',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.ghost_follows f where f.follower_profile_id=ghost_id),'[]'::jsonb),
    'collaboration_requests_sent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.ghost_collaboration_requests r where r.sender_profile_id=ghost_id),'[]'::jsonb),
    'direct_messages_sent',coalesce((select jsonb_agg(to_jsonb(d)-'client_id' order by d.created_at) from public.ghost_direct_messages d where d.sender_profile_id=ghost_id),'[]'::jsonb)
  );
end $fn$;
revoke all on function public.export_ghost_account() from public,anon,authenticated;
grant execute on function public.export_ghost_account() to authenticated;

create function public.deactivate_ghost_account(p_handle text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare
  account_id uuid:=(select auth.uid());
  ghost_id uuid;
begin
  if not lgn_private.is_active_member() then
    raise exception 'An active verified account session is required' using errcode='42501';
  end if;
  select g.id into ghost_id from public.ghost_profiles g
  where g.owner_id=account_id and g.handle=p_handle and g.deleted_at is null;
  if ghost_id is null then
    raise exception 'Enter your exact Ghost handle to deactivate' using errcode='22023';
  end if;
  update lgn_private.member_access set deactivated_at=now(),suspended=true
    where user_id=account_id and deactivated_at is null;
  if not found then raise exception 'Account is already inactive' using errcode='42501'; end if;
  delete from public.ghost_push_subscriptions where profile_id=ghost_id;
  return true;
end $fn$;
revoke all on function public.deactivate_ghost_account(text) from public,anon,authenticated;
grant execute on function public.deactivate_ghost_account(text) to authenticated;
