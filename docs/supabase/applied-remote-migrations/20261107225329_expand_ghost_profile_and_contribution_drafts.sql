-- Exported from lgn-development remote Supabase migration history, 2026-11-07.
-- ALREADY APPLIED to that project. DO NOT replay on its existing database.
-- Historical source record: a clean CLI baseline has not been established.

-- LGN development: richer public Ghost profiles + owner-scoped contribution drafts.
-- Columns on ghost_profiles are explicitly PUBLIC when saved. Do not store private
-- or hidden visibility fields here; the separate preferences table stays private.
begin;
alter table public.ghost_profiles
  add column skills text not null default '' check (char_length(skills)<=1000),
  add column tools text not null default '' check (char_length(tools)<=1000),
  add column platform text not null default '' check (char_length(platform)<=1000),
  add column industry text not null default '' check (char_length(industry)<=1000),
  add column languages text not null default '' check (char_length(languages)<=500),
  add column language text not null default 'en' check (char_length(language) between 2 and 30),
  add column available_for_work boolean not null default false,
  add column open_to_collaboration boolean not null default false,
  add column open_to_research boolean not null default false,
  add column open_to_mentorship boolean not null default false,
  add column open_to_speaking boolean not null default false,
  add column collaboration_interests text not null default '' check (char_length(collaboration_interests)<=1000),
  add column external_links text not null default '' check (char_length(external_links)<=2000),
  add column avatar_template text not null default '' check (char_length(avatar_template)<=150),
  add column featured_work text not null default '' check (char_length(featured_work)<=1000);
grant select (skills,tools,platform,industry,languages,language,
 available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,
 collaboration_interests,external_links,avatar_template,featured_work)
 on public.ghost_profiles to anon,authenticated;
grant update (skills,tools,platform,industry,languages,language,
 available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,
 collaboration_interests,external_links,avatar_template,featured_work)
 on public.ghost_profiles to authenticated;
grant insert (skills,tools,platform,industry,languages,language,
 available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,
 collaboration_interests,external_links,avatar_template,featured_work)
 on public.ghost_profiles to authenticated;

create table public.ghost_contributions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
 kind text not null default 'research' check (char_length(kind) between 2 and 60 and kind ~ '^[a-z_]+$'),
 title text not null default '' check (char_length(title)<=180),
 language text not null default 'en' check (char_length(language) between 2 and 30),
 domain text not null default '' check (char_length(domain)<=250),
 summary text not null default '' check (char_length(summary)<=500),
 body text not null default '' check (char_length(body)<=50000),
 tags text not null default '' check (char_length(tags)<=1500),
 source_url text not null default '' check (char_length(source_url)<=2048),
 code text not null default '' check (char_length(code)<=50000),
 status text not null default 'draft' check (status in ('draft','submitted','revision_requested','published','rejected','archived')),
 version integer not null default 1 check (version>=1),
 submitted_at timestamptz,
 published_at timestamptz,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index ghost_contributions_owner_state_idx on public.ghost_contributions(owner_id,status,updated_at desc);
create index ghost_contributions_public_idx on public.ghost_contributions(published_at desc)
 where status='published' and deleted_at is null;
alter table public.ghost_contributions enable row level security;
revoke all on public.ghost_contributions from public,anon,authenticated;
grant select (id,profile_id,kind,title,language,domain,summary,body,tags,
 source_url,code,status,version,submitted_at,published_at,created_at,updated_at)
 on public.ghost_contributions to anon,authenticated;
grant insert (owner_id,profile_id,kind,title,language,domain,summary,body,
 tags,source_url,code,status) on public.ghost_contributions to authenticated;
grant update (title,language,domain,summary,body,tags,source_url,code,status)
 on public.ghost_contributions to authenticated;
create policy "public sees published contributions only"
 on public.ghost_contributions for select to anon
 using (status='published' and deleted_at is null);
create policy "member sees own contributions or published work"
 on public.ghost_contributions for select to authenticated
 using (deleted_at is null and (status='published' or owner_id=(select auth.uid())));
create policy "confirmed member creates own contribution"
 on public.ghost_contributions for insert to authenticated
 with check (owner_id=(select auth.uid()) and deleted_at is null
  and (select lgn_private.is_active_member())
  and exists (select 1 from public.ghost_profile_links l
    where l.profile_id=ghost_contributions.profile_id and l.owner_id=(select auth.uid())));
create policy "confirmed member changes editable own contribution"
 on public.ghost_contributions for update to authenticated
 using (owner_id=(select auth.uid()) and deleted_at is null
  and status in ('draft','submitted','revision_requested','rejected','archived')
  and (select lgn_private.is_active_member()))
 with check (owner_id=(select auth.uid()) and deleted_at is null
  and status in ('draft','submitted','revision_requested','rejected','archived')
  and (select lgn_private.is_active_member()));
create table public.ghost_contribution_revisions (
 id uuid primary key default gen_random_uuid(),
 contribution_id uuid not null references public.ghost_contributions(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check (version>=1),
 title text not null,
 summary text not null,
 body text not null,
 code text not null,
 status text not null,
 reason text not null,
 created_at timestamptz not null default now(),
 unique(contribution_id,version)
);
create index ghost_contribution_revisions_owner_idx on public.ghost_contribution_revisions(owner_id,contribution_id,version desc);
alter table public.ghost_contribution_revisions enable row level security;
revoke all on public.ghost_contribution_revisions from public,anon,authenticated;
grant select (id,contribution_id,version,title,summary,body,code,status,reason,created_at)
 on public.ghost_contribution_revisions to authenticated;
create policy "owners view own contribution revision snapshots"
 on public.ghost_contribution_revisions for select to authenticated
 using (owner_id=(select auth.uid()));

create function lgn_private.check_member_contribution()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if tg_op='INSERT' then
   if new.status not in ('draft','submitted') then
     raise exception 'Only draft or submitted contributions may be created' using errcode='23514';
   end if;
   new.version:=1;
 else
   if old.status='published' or old.deleted_at is not null then
     raise exception 'Published/deleted work is locked for member edits' using errcode='23514';
   end if;
   if (old.status='draft' and new.status not in ('draft','submitted','archived'))
      or (old.status='submitted' and new.status not in ('submitted','draft'))
      or (old.status in ('revision_requested','rejected') and new.status not in ('draft','submitted','archived'))
      or (old.status='archived' and new.status not in ('archived','draft')) then
     raise exception 'Invalid contribution status transition' using errcode='23514';
   end if;
   if (new.title,new.language,new.domain,new.summary,new.body,new.tags,new.source_url,new.code,new.status)
      is distinct from (old.title,old.language,old.domain,old.summary,old.body,old.tags,old.source_url,old.code,old.status) then
     new.version := old.version+1;
   else new.version := old.version;
   end if;
 end if;
 if new.status='submitted' then
   if char_length(trim(new.title))<10 or char_length(trim(new.summary))<40 or char_length(trim(new.body))<100 then
     raise exception 'Submission requires a title (10+), summary (40+), and method/body (100+)' using errcode='23514';
   end if;
   if new.submitted_at is null then new.submitted_at:=now(); end if;
 end if;
 new.updated_at:=now();
 return new;
end $fn$;
revoke all on function lgn_private.check_member_contribution() from public,anon,authenticated;
create trigger check_member_contribution_before_write
 before insert or update on public.ghost_contributions
 for each row execute function lgn_private.check_member_contribution();

create function lgn_private.capture_contribution_revision()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_op='INSERT' or new.version<>old.version then
   insert into public.ghost_contribution_revisions
    (contribution_id,owner_id,version,title,summary,body,code,status,reason)
   values
    (new.id,new.owner_id,new.version,new.title,new.summary,new.body,new.code,
     new.status,case when tg_op='INSERT' then 'created' else 'edited' end);
 end if;
 return new;
end $fn$;
revoke all on function lgn_private.capture_contribution_revision() from public,anon,authenticated;
create trigger capture_contribution_revision_after_write
 after insert or update on public.ghost_contributions
 for each row execute function lgn_private.capture_contribution_revision();
commit;
