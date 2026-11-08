-- Phase 1 in-app notifications. Only server-side source events can create notices.
create table public.ghost_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  category text not null check (category in ('contributions','projects','table_talks','collaboration')),
  type text not null,
  title text not null,
  body text not null default '',
  link text not null,
  read boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index ghost_notifications_profile_created_idx on public.ghost_notifications(profile_id,created_at desc,id);
create index ghost_notifications_unread_idx on public.ghost_notifications(profile_id)
  where not read and not archived;
create table public.ghost_notification_preferences (
  profile_id uuid primary key references public.ghost_profiles(id) on delete cascade,
  contributions boolean not null default true,
  projects boolean not null default true,
  table_talks boolean not null default true,
  collaboration boolean not null default true
);

alter table public.ghost_notifications enable row level security;
alter table public.ghost_notification_preferences enable row level security;
revoke all on public.ghost_notifications,public.ghost_notification_preferences from public,anon,authenticated;
grant select on public.ghost_notifications,public.ghost_notification_preferences to authenticated;
grant update(read,archived) on public.ghost_notifications to authenticated;
grant insert(profile_id,contributions,projects,table_talks,collaboration),
  update(contributions,projects,table_talks,collaboration) on public.ghost_notification_preferences to authenticated;
create policy "owners read their inbox" on public.ghost_notifications for select to authenticated
  using (profile_id in (select profile_id from public.ghost_profile_links));
create policy "owners update inbox state" on public.ghost_notifications for update to authenticated
  using (profile_id in (select profile_id from public.ghost_profile_links))
  with check (profile_id in (select profile_id from public.ghost_profile_links));
create policy "owners manage notification preferences" on public.ghost_notification_preferences for all to authenticated
  using (profile_id in (select profile_id from public.ghost_profile_links))
  with check (profile_id in (select profile_id from public.ghost_profile_links));

create function lgn_private.emit_ghost_notification(
  p_profile_id uuid,p_category text,p_type text,p_title text,p_body text,p_link text
) returns void
language sql security invoker set search_path='' as $fn$
  insert into public.ghost_notifications(profile_id,category,type,title,body,link)
  select p_profile_id,p_category,p_type,p_title,p_body,p_link
  from public.ghost_profiles g
  left join public.ghost_notification_preferences prefs on prefs.profile_id=g.id
  where g.id=p_profile_id and g.deleted_at is null
    and coalesce(case p_category
      when 'contributions' then prefs.contributions
      when 'projects' then prefs.projects
      when 'table_talks' then prefs.table_talks
      when 'collaboration' then prefs.collaboration
    end,true);
$fn$;
revoke all on function lgn_private.emit_ghost_notification(uuid,text,text,text,text,text) from public,anon,authenticated;

-- All recipients and links come from the originating records. Titles are fixed
-- so private messages, decisions, and reviewer notes are never copied to the inbox.
create function lgn_private.notify_ghost_workspace_event()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare
  recipient uuid;
  target_link text;
begin
  if tg_table_name='ghost_collaboration_requests' then
    if tg_op='INSERT' then
      perform lgn_private.emit_ghost_notification(new.recipient_profile_id,'collaboration',
        'collaboration_request_received','New collaboration request','Review the request in Network.','/ghost-space?section=network');
    elsif new.status is distinct from old.status and new.status in ('accepted','declined') then
      perform lgn_private.emit_ghost_notification(new.sender_profile_id,'collaboration',
        'collaboration_request_updated','Collaboration request decided','Open Network to see the result.','/ghost-space?section=network');
    end if;

  elsif tg_table_name='ghost_project_members' then
    target_link:='/ghost-space?section=projects&project='||new.project_id;
    if tg_op='INSERT' and new.status='invited' then
      perform lgn_private.emit_ghost_notification(new.profile_id,'projects','project_invitation',
        'Project invitation','Open the project to respond.',target_link);
    elsif tg_op='INSERT' and new.status='requested' then
      select profile_id into recipient from public.ghost_projects where id=new.project_id;
      perform lgn_private.emit_ghost_notification(recipient,'projects','participation_received',
        'Project membership requested','Open the project to review the request.',target_link);
    elsif tg_op='UPDATE' and old.status='requested' and new.status in ('accepted','declined') then
      perform lgn_private.emit_ghost_notification(new.profile_id,'projects','participation_received',
        'Project membership decided','Open the project to see the result.',target_link);
    elsif tg_op='UPDATE' and old.status='invited' and new.status='accepted' then
      select profile_id into recipient from public.ghost_projects where id=new.project_id;
      perform lgn_private.emit_ghost_notification(recipient,'projects','participation_received',
        'Project invitation accepted','Open the project to see the updated membership.',target_link);
    end if;

  elsif tg_table_name='ghost_project_tasks' then
    if new.assigned_profile_id is not null and new.assigned_profile_id is distinct from old.assigned_profile_id then
      perform lgn_private.emit_ghost_notification(new.assigned_profile_id,'projects','project_task_assigned',
        'Project task assigned','Open the project to view your task.','/ghost-space?section=projects&project='||new.project_id);
    end if;

  elsif tg_table_name='ghost_project_updates' then
    perform lgn_private.emit_ghost_notification(m.profile_id,'projects','project_update',
      'New project update','Open the project to read the update.','/ghost-space?section=projects&project='||new.project_id)
    from public.ghost_project_members m join public.ghost_projects p on p.id=m.project_id
    where m.project_id=new.project_id and m.status='accepted' and p.visibility='public' and p.status<>'archived';

  elsif tg_table_name='ghost_table_talk_members' then
    if new.role<>'' and new.role is distinct from old.role then
      perform lgn_private.emit_ghost_notification(new.profile_id,'table_talks','table_talk_role_assigned',
        'Table Talk role assigned','Open the exercise to see your role.','/ghost-space?section=table-talks&talk='||new.talk_id);
    end if;

  elsif tg_table_name='ghost_table_talks' then
    if (new.status is distinct from old.status and new.status in ('scheduled','in_progress','completed'))
      or (new.status='scheduled' and new.scheduled_at is distinct from old.scheduled_at) then
      perform lgn_private.emit_ghost_notification(m.profile_id,'table_talks','table_talk_scheduled',
        case new.status when 'in_progress' then 'Table Talk started' when 'completed' then 'Table Talk completed' else 'Table Talk schedule updated' end,
        'Open the exercise for details.','/ghost-space?section=table-talks&talk='||new.id)
      from public.ghost_table_talk_members m where m.talk_id=new.id;
    end if;

  elsif tg_table_name='ghost_table_talk_decisions' then
    select profile_id into recipient from public.ghost_table_talks where id=new.talk_id;
    perform lgn_private.emit_ghost_notification(recipient,'table_talks','table_talk_decision',
      'Table Talk decision recorded','Open the exercise to review participant decisions.','/ghost-space?section=table-talks&talk='||new.talk_id);

  elsif tg_table_name='ghost_contribution_reviews' then
    if new.action in ('published','rejected','revision_requested','triage_cleared') then
      select profile_id into recipient from public.ghost_contributions where id=new.contribution_id;
      perform lgn_private.emit_ghost_notification(recipient,'contributions',
        case new.action when 'published' then 'work_published' when 'rejected' then 'work_rejected'
          when 'revision_requested' then 'work_revision_requested' else 'review_feedback' end,
        'Contribution review updated','Open Contributions to see the review outcome.','/ghost-space?section=contributions');
    end if;
  end if;
  return new;
end $fn$;
revoke all on function lgn_private.notify_ghost_workspace_event() from public,anon,authenticated;

create trigger notify_network_request after insert or update of status on public.ghost_collaboration_requests
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_project_membership after insert or update of status on public.ghost_project_members
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_project_assignment after update of assigned_profile_id on public.ghost_project_tasks
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_project_progress after insert on public.ghost_project_updates
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_table_talk_role after update of role on public.ghost_table_talk_members
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_table_talk_lifecycle after update of status,scheduled_at on public.ghost_table_talks
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_table_talk_decision after insert on public.ghost_table_talk_decisions
  for each row execute function lgn_private.notify_ghost_workspace_event();
create trigger notify_contribution_review after insert on public.ghost_contribution_reviews
  for each row execute function lgn_private.notify_ghost_workspace_event();
