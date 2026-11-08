-- Network Phase 1. Historical requests and searches are imported separately.
create table public.ghost_collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  recipient_profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  subject text not null check (char_length(trim(subject)) between 1 and 180),
  message text not null check (char_length(trim(message)) between 1 and 3000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  check (sender_profile_id<>recipient_profile_id)
);
create unique index ghost_collaboration_requests_pending_pair
  on public.ghost_collaboration_requests(least(sender_profile_id,recipient_profile_id),greatest(sender_profile_id,recipient_profile_id))
  where status='pending';
create index ghost_collaboration_requests_sender_idx on public.ghost_collaboration_requests(sender_profile_id,created_at desc);
create index ghost_collaboration_requests_recipient_idx on public.ghost_collaboration_requests(recipient_profile_id,created_at desc);

create table public.ghost_saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  query text not null default '' check (char_length(query)<=250),
  collaboration_only boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index ghost_saved_searches_profile_name_idx on public.ghost_saved_searches(profile_id,lower(trim(name)));

alter table public.ghost_collaboration_requests enable row level security;
alter table public.ghost_saved_searches enable row level security;
revoke all on public.ghost_collaboration_requests,public.ghost_saved_searches from public,anon,authenticated;
grant select on public.ghost_collaboration_requests,public.ghost_saved_searches to authenticated;
grant insert(sender_profile_id,recipient_profile_id,subject,message),update(status)
  on public.ghost_collaboration_requests to authenticated;
grant insert(profile_id,name,query,collaboration_only),delete on public.ghost_saved_searches to authenticated;

create policy "active parties read their requests" on public.ghost_collaboration_requests for select to authenticated
  using ((select lgn_private.is_active_member()) and (
    sender_profile_id in (select profile_id from public.ghost_profile_links)
    or recipient_profile_id in (select profile_id from public.ghost_profile_links)));
create policy "active senders create pending requests" on public.ghost_collaboration_requests for insert to authenticated
  with check ((select lgn_private.is_active_member()) and status='pending'
    and sender_profile_id in (select profile_id from public.ghost_profile_links)
    and exists (select 1 from public.ghost_profiles p where p.id=recipient_profile_id));
create policy "active recipients decide pending requests" on public.ghost_collaboration_requests for update to authenticated
  using ((select lgn_private.is_active_member()) and status='pending'
    and recipient_profile_id in (select profile_id from public.ghost_profile_links))
  with check ((select lgn_private.is_active_member()) and status in ('accepted','declined')
    and recipient_profile_id in (select profile_id from public.ghost_profile_links));
create policy "active senders withdraw pending requests" on public.ghost_collaboration_requests for update to authenticated
  using ((select lgn_private.is_active_member()) and status='pending'
    and sender_profile_id in (select profile_id from public.ghost_profile_links))
  with check ((select lgn_private.is_active_member()) and status='withdrawn'
    and sender_profile_id in (select profile_id from public.ghost_profile_links));

create policy "active owners manage private saved searches" on public.ghost_saved_searches for all to authenticated
  using ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link))
  with check ((select lgn_private.is_active_member())
    and profile_id in (select link.profile_id from public.ghost_profile_links link));
