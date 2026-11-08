-- Private one-way follows are independent of mutual collaboration connections.
create table public.ghost_follows (
  follower_profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  followed_profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_profile_id,followed_profile_id),
  check(follower_profile_id<>followed_profile_id)
);
create index ghost_follows_followed_idx on public.ghost_follows(followed_profile_id);
alter table public.ghost_follows enable row level security;
revoke all on public.ghost_follows from public,anon,authenticated;
grant select,delete on public.ghost_follows to authenticated;
grant insert(follower_profile_id,followed_profile_id) on public.ghost_follows to authenticated;

create policy "owners see their own follows" on public.ghost_follows for select to authenticated
  using (follower_profile_id in (select profile_id from public.ghost_profile_links));
create policy "active Ghosts follow visible profiles" on public.ghost_follows for insert to authenticated
  with check ((select lgn_private.is_active_member())
    and follower_profile_id in (select profile_id from public.ghost_profile_links)
    and exists (select 1 from public.ghost_profiles p where p.id=followed_profile_id));
create policy "owners can unfollow" on public.ghost_follows for delete to authenticated
  using (follower_profile_id in (select profile_id from public.ghost_profile_links));

alter table public.ghost_notification_preferences
  add column following boolean not null default false;
grant insert(following),update(following) on public.ghost_notification_preferences to authenticated;

create function lgn_private.notify_followers_of_publication()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.status<>'published' or new.deleted_at is not null then return new; end if;
  if tg_op='UPDATE' and old.status='published' then return new; end if;
  if exists (select 1 from public.ghost_contribution_revisions r
    where r.contribution_id=new.id and r.version<new.version and r.status='published') then
    return new;
  end if;

  insert into public.ghost_notifications(profile_id,category,type,title,body,link)
  select f.follower_profile_id,'contributions','followed_work_published',
    'New work from a Ghost you follow','Open the published contribution to read it.','/work/'||new.id
  from public.ghost_follows f
  join public.ghost_notification_preferences prefs on prefs.profile_id=f.follower_profile_id and prefs.following
  join public.ghost_profiles g on g.id=f.follower_profile_id and g.deleted_at is null
  where f.followed_profile_id=new.profile_id;
  return new;
end $fn$;
revoke all on function lgn_private.notify_followers_of_publication() from public,anon,authenticated;
create trigger notify_followers_after_publication
  after insert or update of status on public.ghost_contributions
  for each row execute function lgn_private.notify_followers_of_publication();
