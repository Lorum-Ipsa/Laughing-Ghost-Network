-- Phase 1 Table Talks. Historical exercise records are migrated separately.
create table public.ghost_table_talks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  summary text not null default '' check (char_length(summary) <=1200),
  status text not null default 'draft' check (status in ('draft','open','scheduled','in_progress','completed','archived')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ghost_table_talks enable row level security;

create table public.ghost_table_talk_members (
  talk_id uuid not null references public.ghost_table_talks(id) on delete cascade,
  profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  role text not null default '' check (char_length(role) <=100),
  primary key(talk_id,profile_id)
);
alter table public.ghost_table_talk_members enable row level security;

create table public.ghost_table_talk_materials (
  talk_id uuid not null references public.ghost_table_talks(id) on delete cascade,
  primary key(talk_id),
  objectives text not null default '' check (char_length(objectives) <=10000),
  scenario text not null default '' check (char_length(scenario) <=10000),
  timeline text not null default '' check (char_length(timeline) <=10000),
  injects text not null default '' check (char_length(injects) <=10000),
  evidence text not null default '' check (char_length(evidence) <=10000),
  decision_points text not null default '' check (char_length(decision_points) <=10000)
);
alter table public.ghost_table_talk_materials enable row level security;

create table public.ghost_table_talk_debriefs (
  talk_id uuid not null references public.ghost_table_talks(id) on delete cascade,
  primary key(talk_id),
  body text not null check (char_length(trim(body)) between 1 and 10000)
);
alter table public.ghost_table_talk_debriefs enable row level security;

create table public.ghost_table_talk_decisions (
  id uuid primary key default gen_random_uuid(),
  talk_id uuid not null references public.ghost_table_talks(id) on delete cascade,
  profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  point text not null check (char_length(trim(point)) between 1 and 500),
  decision text not null check (char_length(trim(decision)) between 1 and 2000),
  rationale text not null default '' check (char_length(rationale) <=5000),
  created_at timestamptz not null default now()
);
alter table public.ghost_table_talk_decisions enable row level security;

create index ghost_table_talks_owner_idx on public.ghost_table_talks(profile_id);
create index ghost_table_talk_members_profile_idx on public.ghost_table_talk_members(profile_id);
create index ghost_table_talk_decisions_talk_profile_idx on public.ghost_table_talk_decisions(talk_id,profile_id);

revoke all on public.ghost_table_talks, public.ghost_table_talk_members, public.ghost_table_talk_materials, public.ghost_table_talk_debriefs, public.ghost_table_talk_decisions from public,anon,authenticated;
grant select on public.ghost_table_talks to anon,authenticated;
grant select on public.ghost_table_talk_members, public.ghost_table_talk_materials, public.ghost_table_talk_debriefs, public.ghost_table_talk_decisions to authenticated;
grant insert(profile_id,title,summary),update(title,summary,status,scheduled_at) on public.ghost_table_talks to authenticated;
grant insert(talk_id,profile_id),update(role),delete on public.ghost_table_talk_members to authenticated;
grant insert(talk_id,objectives,scenario,timeline,injects,evidence,decision_points),update(objectives,scenario,timeline,injects,evidence,decision_points) on public.ghost_table_talk_materials to authenticated;
grant insert(talk_id,body),update(body) on public.ghost_table_talk_debriefs to authenticated;
grant insert(talk_id,profile_id,point,decision,rationale),update(point,decision,rationale),delete on public.ghost_table_talk_decisions to authenticated;
create policy "visitors see published briefs" on public.ghost_table_talks for select to anon,authenticated
  using (status not in ('draft','archived'));
create policy "facilitators read own talks" on public.ghost_table_talks for select to authenticated
  using ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link));
create policy "facilitators create drafts" on public.ghost_table_talks for insert to authenticated
  with check ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link) and status='draft');
create policy "facilitators update own talks" on public.ghost_table_talks for update to authenticated
  using ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link))
  with check ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link));
create policy "participants and facilitators read registrations" on public.ghost_table_talk_members for select to authenticated
  using ((select lgn_private.is_active_member()) and (profile_id in (select link.profile_id from public.ghost_profile_links link) or exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_members.talk_id)));
create policy "active Ghosts join open or scheduled talks" on public.ghost_table_talk_members for insert to authenticated
  with check ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link) and exists (select 1 from public.ghost_table_talks t where t.id=ghost_table_talk_members.talk_id and t.status in ('open','scheduled') and t.profile_id<>ghost_table_talk_members.profile_id));
create policy "facilitators assign participant roles" on public.ghost_table_talk_members for update to authenticated
  using ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_members.talk_id))
  with check ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_members.talk_id));
create policy "participants leave or facilitators remove" on public.ghost_table_talk_members for delete to authenticated
  using ((select lgn_private.is_active_member()) and (profile_id in (select link.profile_id from public.ghost_profile_links link) or exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_members.talk_id)));
create policy "facilitators manage exercise content" on public.ghost_table_talk_materials for all to authenticated
  using ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_materials.talk_id))
  with check ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_materials.talk_id));
create policy "registered Ghosts see released exercise content" on public.ghost_table_talk_materials for select to authenticated
  using ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talk_members m join public.ghost_profile_links link on link.profile_id=m.profile_id join public.ghost_table_talks t on t.id=m.talk_id where m.talk_id=ghost_table_talk_materials.talk_id and t.status in ('in_progress','completed')));
create policy "facilitators manage exercise content" on public.ghost_table_talk_debriefs for all to authenticated
  using ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_debriefs.talk_id))
  with check ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_debriefs.talk_id));
create policy "registered Ghosts see released exercise content" on public.ghost_table_talk_debriefs for select to authenticated
  using ((select lgn_private.is_active_member()) and exists (select 1 from public.ghost_table_talk_members m join public.ghost_profile_links link on link.profile_id=m.profile_id join public.ghost_table_talks t on t.id=m.talk_id where m.talk_id=ghost_table_talk_debriefs.talk_id and t.status='completed'));
create policy "decision authors and facilitators read decisions" on public.ghost_table_talk_decisions for select to authenticated
  using ((select lgn_private.is_active_member()) and (profile_id in (select link.profile_id from public.ghost_profile_links link) or exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_decisions.talk_id)));
create policy "registered Ghosts submit decisions during exercise" on public.ghost_table_talk_decisions for insert to authenticated
  with check ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link) and exists (select 1 from public.ghost_table_talk_members m join public.ghost_profile_links link on link.profile_id=m.profile_id join public.ghost_table_talks t on t.id=m.talk_id where m.talk_id=ghost_table_talk_decisions.talk_id and t.status='in_progress'));
create policy "registered Ghosts revise their live decisions" on public.ghost_table_talk_decisions for update to authenticated
  using ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link) and exists (select 1 from public.ghost_table_talk_members m join public.ghost_profile_links link on link.profile_id=m.profile_id join public.ghost_table_talks t on t.id=m.talk_id where m.talk_id=ghost_table_talk_decisions.talk_id and t.status='in_progress'))
  with check ((select lgn_private.is_active_member()) and profile_id in (select link.profile_id from public.ghost_profile_links link) and exists (select 1 from public.ghost_table_talk_members m join public.ghost_profile_links link on link.profile_id=m.profile_id join public.ghost_table_talks t on t.id=m.talk_id where m.talk_id=ghost_table_talk_decisions.talk_id and t.status='in_progress'));
create policy "authors and facilitators remove decisions" on public.ghost_table_talk_decisions for delete to authenticated
  using ((select lgn_private.is_active_member()) and (profile_id in (select link.profile_id from public.ghost_profile_links link) or exists (select 1 from public.ghost_table_talks t join public.ghost_profile_links link on link.profile_id=t.profile_id where t.id=ghost_table_talk_decisions.talk_id)));
