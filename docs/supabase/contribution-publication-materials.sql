-- Pending development migration. Apply after publish-research-with-targeted-screening.sql.
create table public.ghost_contribution_translations (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.ghost_contributions(id) on delete cascade,
  version integer not null check (version>=1),
  language text not null check (language ~ '^[a-z]{2,8}(-[A-Za-z0-9]{2,8}){0,2}$'),
  title text not null check (char_length(trim(title)) between 1 and 180),
  summary text not null default '' check (char_length(summary)<=500),
  body text not null default '' check (char_length(body)<=50000),
  source text not null check (source in ('human','machine')),
  created_at timestamptz not null default now(),
  unique (contribution_id,version,language),
  check (not lgn_private.has_contribution_credential_signal(concat_ws(E'\n',title,summary,body)))
);
create table public.ghost_contribution_text_attachments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.ghost_contributions(id) on delete cascade,
  version integer not null check (version>=1),
  filename text not null check (filename ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'),
  content text not null check (octet_length(content) between 1 and 65536),
  created_at timestamptz not null default now(),
  unique (contribution_id,version,filename),
  check (translate(content,E'\t\r\n','') !~ '[[:cntrl:]]'),
  check (not lgn_private.has_contribution_credential_signal(concat_ws(E'\n',filename,content)))
);

-- These policies use the parent row's RLS, its published status, and its exact
-- version. Authors cannot publish supplements on someone else's contribution.
alter table public.ghost_contribution_translations enable row level security;
alter table public.ghost_contribution_text_attachments enable row level security;
revoke all on public.ghost_contribution_translations,public.ghost_contribution_text_attachments
  from public,anon,authenticated;
grant select on public.ghost_contribution_translations,public.ghost_contribution_text_attachments
  to anon,authenticated;
grant insert(contribution_id,version,language,title,summary,body,source),delete
  on public.ghost_contribution_translations to authenticated;
grant insert(contribution_id,version,filename,content),delete
  on public.ghost_contribution_text_attachments to authenticated;
create policy "public reads materials for the current published version"
  on public.ghost_contribution_translations for select to anon,authenticated
  using (exists (
    select 1 from public.ghost_contributions c
    where c.id=contribution_id and c.version=ghost_contribution_translations.version and c.status='published'
  ));
create policy "active owner adds materials to the current published version"
  on public.ghost_contribution_translations for insert to authenticated
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_contributions c
    join public.ghost_profile_links link on link.profile_id=c.profile_id
    where c.id=contribution_id and c.version=ghost_contribution_translations.version and c.status='published' and lower(c.language)<>lower(ghost_contribution_translations.language)
  ));
create policy "active owner removes published materials"
  on public.ghost_contribution_translations for delete to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_contributions c
    join public.ghost_profile_links link on link.profile_id=c.profile_id
    where c.id=contribution_id
  ));

create policy "public reads materials for the current published version"
  on public.ghost_contribution_text_attachments for select to anon,authenticated
  using (exists (
    select 1 from public.ghost_contributions c
    where c.id=contribution_id and c.version=ghost_contribution_text_attachments.version and c.status='published'
  ));
create policy "active owner adds materials to the current published version"
  on public.ghost_contribution_text_attachments for insert to authenticated
  with check ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_contributions c
    join public.ghost_profile_links link on link.profile_id=c.profile_id
    where c.id=contribution_id and c.version=ghost_contribution_text_attachments.version and c.status='published'
  ));
create policy "active owner removes published materials"
  on public.ghost_contribution_text_attachments for delete to authenticated
  using ((select lgn_private.is_active_member()) and exists (
    select 1 from public.ghost_contributions c
    join public.ghost_profile_links link on link.profile_id=c.profile_id
    where c.id=contribution_id
  ));
