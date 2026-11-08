-- Pending development migration. Apply after projects-collaboration.sql.
create table public.ghost_project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text not null default '' check (char_length(description)<=2000),
  is_open boolean not null default true,
  unique(project_id,id)
);
create table public.ghost_project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  due_on date,
  completed boolean not null default false
);
create index ghost_project_milestones_project_idx on public.ghost_project_milestones(project_id,due_on);
create table public.ghost_project_watches (
  project_id uuid not null references public.ghost_projects(id) on delete cascade,
  profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  primary key(project_id,profile_id)
);
create index ghost_project_watches_profile_idx on public.ghost_project_watches(profile_id);
alter table public.ghost_project_members
  add column role_id uuid,
  drop constraint ghost_project_members_status_check,
  add check (status in ('requested','invited','accepted','declined')),
  add constraint ghost_project_members_role_fkey
    foreign key(project_id,role_id) references public.ghost_project_roles(project_id,id)
    on delete set null (role_id);
create index ghost_project_members_role_idx on public.ghost_project_members(project_id,role_id)
  where role_id is not null;

alter table public.ghost_project_roles enable row level security;
alter table public.ghost_project_milestones enable row level security;
alter table public.ghost_project_watches enable row level security;
revoke all on public.ghost_project_roles,public.ghost_project_milestones,public.ghost_project_watches
  from public,anon,authenticated;
grant select on public.ghost_project_roles to anon,authenticated;
grant select on public.ghost_project_milestones,public.ghost_project_watches to authenticated;
grant insert(project_id,title,description),update(title,description,is_open),delete
  on public.ghost_project_roles to authenticated;
grant insert(project_id,title,due_on),update(title,due_on,completed),delete
  on public.ghost_project_milestones to authenticated;
grant insert(project_id,profile_id),delete on public.ghost_project_watches to authenticated;
grant insert(status,role_id) on public.ghost_project_members to authenticated;

create policy "public sees open roles for active recruiting projects"
  on public.ghost_project_roles for select to anon,authenticated
  using (is_open and exists (select 1 from public.ghost_projects p
    where p.id=project_id and p.visibility='public' and p.status='active' and p.recruiting));

create policy "active maintainers manage roles"
  on public.ghost_project_roles for all to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id))
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));

create policy "active maintainers manage milestones"
  on public.ghost_project_milestones for all to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id))
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_projects p join public.ghost_profile_links link on link.profile_id=p.profile_id
    where p.id=project_id));

create policy "active accepted members read milestones"
  on public.ghost_project_milestones for select to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_project_members m
    join public.ghost_profile_links link on link.profile_id=m.profile_id
    join public.ghost_projects p on p.id=m.project_id
    where m.project_id=ghost_project_milestones.project_id and m.status='accepted'));

create policy "watchers read their own watches"
  on public.ghost_project_watches for select to authenticated
  using (profile_id in (select link.profile_id from public.ghost_profile_links link));
create policy "active members watch visible projects"
  on public.ghost_project_watches for insert to authenticated
  with check ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link)
    and exists (select 1 from public.ghost_projects p
      where p.id=project_id and p.visibility='public' and p.status<>'archived'));
create policy "watchers remove their own watches"
  on public.ghost_project_watches for delete to authenticated
  using (profile_id in (select link.profile_id from public.ghost_profile_links link));

alter policy "active members request membership in recruiting projects"
  on public.ghost_project_members
  with check ((select lgn_private.is_active_member()) and status='requested'
    and profile_id in (select link.profile_id from public.ghost_profile_links link)
    and exists (select 1 from public.ghost_projects p
      where p.id=project_id and p.visibility='public' and p.status='active' and p.recruiting
        and p.profile_id<>ghost_project_members.profile_id)
    and (role_id is null or exists (select 1 from public.ghost_project_roles r
      where r.id=role_id and r.project_id=ghost_project_members.project_id and r.is_open)));

create policy "active maintainers invite another Ghost"
  on public.ghost_project_members for insert to authenticated
  with check ((select lgn_private.is_active_member()) and status='invited' and role_id is null
    and exists (select 1 from public.ghost_projects p
      join public.ghost_profile_links link on link.profile_id=p.profile_id
      where p.id=project_id and p.profile_id<>ghost_project_members.profile_id
        and p.visibility='public' and p.status='active'));

create policy "active invitees accept their own invitations"
  on public.ghost_project_members for update to authenticated
  using ((select lgn_private.is_active_member()) and status='invited'
    and profile_id in (select link.profile_id from public.ghost_profile_links link))
  with check ((select lgn_private.is_active_member()) and status='accepted'
    and profile_id in (select link.profile_id from public.ghost_profile_links link)
    and exists (select 1 from public.ghost_projects p
      where p.id=project_id and p.visibility='public' and p.status='active'));
