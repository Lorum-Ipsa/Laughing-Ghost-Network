-- Live inbox changes and durable per-device push delivery.
alter publication supabase_realtime add table public.ghost_notifications;

create table public.ghost_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ghost_profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint)<=2048 and endpoint like 'https://%'),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  created_at timestamptz not null default now()
);
create index ghost_push_subscriptions_profile_idx on public.ghost_push_subscriptions(profile_id);
alter table public.ghost_push_subscriptions enable row level security;
revoke all on public.ghost_push_subscriptions from public,anon,authenticated;
grant select(id,profile_id,endpoint),delete on public.ghost_push_subscriptions to authenticated;
grant insert(profile_id,endpoint,p256dh,auth) on public.ghost_push_subscriptions to authenticated;
create policy "owners manage their browser subscriptions" on public.ghost_push_subscriptions for all to authenticated
  using (profile_id in (select profile_id from public.ghost_profile_links))
  with check ((select lgn_private.is_active_member()) and profile_id in (select profile_id from public.ghost_profile_links));

create table lgn_private.ghost_push_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.ghost_notifications(id) on delete cascade,
  subscription_id uuid not null references public.ghost_push_subscriptions(id) on delete cascade,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  unique(notification_id,subscription_id)
);
create index ghost_push_jobs_available_idx on lgn_private.ghost_push_jobs(available_at);
alter table lgn_private.ghost_push_jobs enable row level security;
revoke all on lgn_private.ghost_push_jobs from public,anon,authenticated;

create function lgn_private.enqueue_ghost_push()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  insert into lgn_private.ghost_push_jobs(notification_id,subscription_id)
  select new.id,s.id from public.ghost_push_subscriptions s where s.profile_id=new.profile_id;
  return new;
end $fn$;
revoke all on function lgn_private.enqueue_ghost_push() from public,anon,authenticated;
create trigger enqueue_ghost_push_after_notice
  after insert on public.ghost_notifications for each row execute function lgn_private.enqueue_ghost_push();

select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'lgn_push_dispatch_token');

create function public.ghost_push_public_key()
returns text language sql stable security definer set search_path='' as $fn$
  select decrypted_secret from vault.decrypted_secrets where name='lgn_push_vapid_public';
$fn$;
revoke all on function public.ghost_push_public_key() from public,anon,authenticated;
grant execute on function public.ghost_push_public_key() to authenticated;

create function public.ghost_push_worker_context(p_token text,p_public text,p_private text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  expected text;
  public_key text;
  private_key text;
begin
  select decrypted_secret into expected from vault.decrypted_secrets where name='lgn_push_dispatch_token';
  if expected is null or p_token is null
    or extensions.digest(expected,'sha256')<>extensions.digest(p_token,'sha256') then return null; end if;

  perform pg_advisory_xact_lock(589431026);
  select decrypted_secret into public_key from vault.decrypted_secrets where name='lgn_push_vapid_public';
  select decrypted_secret into private_key from vault.decrypted_secrets where name='lgn_push_vapid_private';
  if public_key is null and private_key is null then
    if p_public is null or p_private is null then return null; end if;
    perform vault.create_secret(p_public,'lgn_push_vapid_public');
    perform vault.create_secret(p_private,'lgn_push_vapid_private');
    public_key:=p_public;
    private_key:=p_private;
  end if;
  return jsonb_build_object('public_key',public_key,'private_key',private_key);
end $fn$;
revoke all on function public.ghost_push_worker_context(text,text,text) from public,anon,authenticated;
grant execute on function public.ghost_push_worker_context(text,text,text) to service_role;

create function public.claim_ghost_push_jobs()
returns table(job_id uuid,notification_id uuid,lease_id uuid,endpoint text,p256dh text,auth text)
language sql security definer set search_path='' as $fn$
  with candidates as (
    select j.id from lgn_private.ghost_push_jobs j
    where j.available_at<=now() and (j.lease_until is null or j.lease_until<=now())
    order by j.available_at,j.id limit 25 for update skip locked
  ), leased as (
    update lgn_private.ghost_push_jobs j set lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
    from candidates c where j.id=c.id
    returning j.id,j.notification_id,j.lease_id,j.subscription_id
  )
  select l.id,l.notification_id,l.lease_id,s.endpoint,s.p256dh,s.auth
  from leased l join public.ghost_push_subscriptions s on s.id=l.subscription_id;
$fn$;
revoke all on function public.claim_ghost_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_ghost_push_jobs() to service_role;

create function public.finish_ghost_push_job(p_job_id uuid,p_lease_id uuid,p_result text)
returns void language plpgsql security definer set search_path='' as $fn$
declare
  job lgn_private.ghost_push_jobs%rowtype;
begin
  if p_result='expired' then
    delete from public.ghost_push_subscriptions where id=(
      select subscription_id from lgn_private.ghost_push_jobs
      where id=p_job_id and lease_id=p_lease_id
    );
    return;
  end if;
  select * into job from lgn_private.ghost_push_jobs
  where id=p_job_id and lease_id=p_lease_id for update;
  if not found then return; end if;
  if p_result='retry' and job.attempts<3 then
    update lgn_private.ghost_push_jobs set attempts=job.attempts+1,
      available_at=now()+make_interval(mins=>(2^job.attempts)::integer),
      lease_id=null,lease_until=null where id=job.id;
  else
    delete from lgn_private.ghost_push_jobs where id=job.id;
  end if;
end $fn$;
revoke all on function public.finish_ghost_push_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_ghost_push_job(uuid,uuid,text) to service_role;
