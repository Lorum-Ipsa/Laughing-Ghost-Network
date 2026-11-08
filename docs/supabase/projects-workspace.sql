-- Pending LGN development migration. No PocketBase records are imported.
create table public.ghost_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  summary text not null default '' check (char_length(summary)<=1200),
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'active' check (status in ('active','completed','archived')),
  recruiting boolean not null default false,
  created_at timestamptz not null default now()
);
create index ghost_projects_profile_idx on public.ghost_projects(profile_id);

create table public.ghost_project_members (
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key(project_id,profile_id)
);
create index ghost_project_members_profile_idx on public.ghost_project_members(profile_id);

create table public.ghost_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description)<=5000),
  status text not null default 'open' check (status in ('open','in_progress','complete')),
  created_at timestamptz not null default now()
);
create index ghost_project_tasks_project_idx on public.ghost_project_tasks(project_id);

alter table public.ghost_projects enable row level security;
alter table public.ghost_project_members enable row level security;
alter table public.ghost_project_tasks enable row level security;
revoke all on public.ghost_projects,public.ghost_project_members,public.ghost_project_tasks
  from public,anon,authenticated;
grant select on public.ghost_projects to anon,authenticated;
grant insert(profile_id,title,summary), update(title,summary,visibility,status,recruiting)
  on public.ghost_projects to authenticated;
grant select on public.ghost_project_members,public.ghost_project_tasks to authenticated;
grant insert(project_id,profile_id), update(status), delete on public.ghost_project_members to authenticated;
grant insert(project_id,title,description), update(title,description,status), delete on public.ghost_project_tasks to authenticated;

create policy "public projects are visible"
  on public.ghost_projects for select to anon,authenticated
  using (visibility='public' and status<>'archived');
create policy "active owners see their projects"
  on public.ghost_projects for select to authenticated
  using ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link));
create policy "active owners create their projects"
  on public.ghost_projects for insert to authenticated
  with check ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link));
create policy "active owners update their projects"
  on public.ghost_projects for update to authenticated
  using ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link))
  with check ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link));

-- The project policies do not query members or tasks. Child policies can
-- therefore scope by project ownership without recursive RLS.
create policy "active applicants and maintainers read memberships"
  on public.ghost_project_members for select to authenticated
  using ((select lgn_private.is_active_member()) and (
    profile_id in (select link.profile_id from public.ghost_profile_links link)
    or exists (select 1 from public.ghost_projects p
      join public.ghost_profile_links link on link.profile_id=p.profile_id where p.id=project_id)
  ));
create policy "active members request membership in recruiting projects"
  on public.ghost_project_members for insert to authenticated
  with check ((select lgn_private.is_active_member()) and status='requested'
    and profile_id in (select link.profile_id from public.ghost_profile_links link)
    and exists (select 1 from public.ghost_projects p
      where p.id=project_id and p.visibility='public' and p.status='active' and p.recruiting
        and p.profile_id<>ghost_project_members.profile_id));
create policy "active maintainers decide membership"
  on public.ghost_project_members for update to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id))
  with check ((select lgn_private.is_active_member()) and status in ('accepted','declined') and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));
create policy "active members leave or maintainers remove members"
  on public.ghost_project_members for delete to authenticated
  using ((select lgn_private.is_active_member()) and (
    profile_id in (select link.profile_id from public.ghost_profile_links link)
    or exists (select 1 from public.ghost_projects p
      join public.ghost_profile_links link on link.profile_id=p.profile_id where p.id=project_id)
  ));

create policy "active maintainers and accepted members read project tasks"
  on public.ghost_project_tasks for select to authenticated
  using ((select lgn_private.is_active_member()) and (
    exists (select 1 from public.ghost_projects p
      join public.ghost_profile_links link on link.profile_id=p.profile_id where p.id=project_id)
    or exists (select 1 from public.ghost_project_members m
      join public.ghost_profile_links link on link.profile_id=m.profile_id
      join public.ghost_projects p on p.id=m.project_id
      where m.project_id=ghost_project_tasks.project_id and m.status='accepted')
  ));
create policy "active maintainers manage tasks"
  on public.ghost_project_tasks for all to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id))
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));
