-- Pending LGN development migration. Apply after projects-workspace.sql.
alter table public.ghost_project_tasks
  add column assigned_profile_id uuid,
  add constraint ghost_project_tasks_membership_fkey
    foreign key(project_id,assigned_profile_id)
    references public.ghost_project_members(project_id,profile_id)
    on delete set null (assigned_profile_id);
create index ghost_project_tasks_assignment_idx
  on public.ghost_project_tasks(project_id,assigned_profile_id)
  where assigned_profile_id is not null;
grant update(assigned_profile_id) on public.ghost_project_tasks to authenticated;

-- Only pending requests can be decided. Removing an accepted member clears
-- their assignments through the composite foreign key.
alter policy "active maintainers decide membership" on public.ghost_project_members
  using (status='requested' and (select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));

create function lgn_private.validate_project_task_assignment()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  if new.assigned_profile_id is not null and not exists (
    select 1 from public.ghost_project_members m
    where m.project_id=new.project_id and m.profile_id=new.assigned_profile_id and m.status='accepted'
  ) then
    raise exception 'Select an accepted project member' using errcode='23514';
  end if;
  return new;
end $fn$;
revoke all on function lgn_private.validate_project_task_assignment() from public,anon,authenticated;
create trigger validate_project_task_assignment_before_write
  before insert or update of assigned_profile_id on public.ghost_project_tasks
  for each row execute function lgn_private.validate_project_task_assignment();

-- Assignees can change only task status. The guarded update checks membership,
-- assignment and the prior status in the same statement.
create function public.update_assigned_project_task_status(
  p_task_id uuid,p_expected_status text,p_status text
) returns boolean
language plpgsql security definer set search_path='' as $fn$
begin
  if (select auth.uid()) is null or not lgn_private.is_active_member() then
    raise exception 'An active member is required' using errcode='42501';
  end if;
  if p_status is null or p_status not in ('open','in_progress','complete')
    or p_expected_status is null then
    raise exception 'A valid task status is required' using errcode='22023';
  end if;

  update public.ghost_project_tasks t set status=p_status
  where t.id=p_task_id and t.status=p_expected_status and exists (
    select 1 from public.ghost_project_members m
    join public.ghost_projects p on p.id=m.project_id
    join public.ghost_profiles g on g.id=m.profile_id
    where m.project_id=t.project_id and m.profile_id=t.assigned_profile_id
      and m.status='accepted' and g.owner_id=(select auth.uid()) and g.deleted_at is null
      and p.visibility='public' and p.status<>'archived'
  );
  if not found then
    raise exception 'The assigned task is unavailable or has changed' using errcode='42501';
  end if;
  return true;
end $fn$;
revoke all on function public.update_assigned_project_task_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.update_assigned_project_task_status(uuid,text,text) to authenticated;

create table public.ghost_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index ghost_project_updates_project_created_idx on public.ghost_project_updates(project_id,created_at desc);
alter table public.ghost_project_updates enable row level security;
revoke all on public.ghost_project_updates from public,anon,authenticated;
grant select on public.ghost_project_updates to authenticated;
grant insert(project_id,title,body) on public.ghost_project_updates to authenticated;

create policy "active maintainers and accepted members read project updates"
  on public.ghost_project_updates for select to authenticated
  using ((select lgn_private.is_active_member()) and (
    exists (select 1 from public.ghost_projects p
      join public.ghost_profile_links link on link.profile_id=p.profile_id where p.id=project_id)
    or exists (select 1 from public.ghost_project_members m
      join public.ghost_profile_links link on link.profile_id=m.profile_id
      join public.ghost_projects p on p.id=m.project_id
      where m.project_id=ghost_project_updates.project_id and m.status='accepted')
  ));
create policy "active maintainers post project updates"
  on public.ghost_project_updates for insert to authenticated
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));
