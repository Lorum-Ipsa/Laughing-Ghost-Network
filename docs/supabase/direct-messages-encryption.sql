-- New DMs carry ciphertext only. Existing plaintext rows stay readable and labeled.
create table public.ghost_dm_identity_keys (
  profile_id uuid primary key references public.ghost_profiles(id) on delete restrict,
  public_key text not null check(public_key ~ '^B[A-Za-z0-9_-]{86}$'),
  created_at timestamptz not null default now()
);
alter table public.ghost_dm_identity_keys enable row level security;
revoke all on public.ghost_dm_identity_keys from public,anon,authenticated;
grant select on public.ghost_dm_identity_keys to authenticated;
grant insert(profile_id,public_key) on public.ghost_dm_identity_keys to authenticated;
create policy "active owners register one immutable messaging identity" on public.ghost_dm_identity_keys
  for insert to authenticated with check ((select lgn_private.is_active_member())
    and profile_id in (select profile_id from public.ghost_profile_links));
create policy "active Ghosts read their own and conversation peer keys" on public.ghost_dm_identity_keys
  for select to authenticated using ((select lgn_private.is_active_member()) and (
    profile_id in (select profile_id from public.ghost_profile_links)
    or exists (select 1 from public.ghost_dm_threads t where profile_id in (t.first_profile_id,t.second_profile_id))
    or exists (select 1 from public.ghost_collaboration_requests r
      where r.status='accepted' and profile_id in (r.sender_profile_id,r.recipient_profile_id))
  ));

alter table public.ghost_direct_messages
  add column encrypted boolean not null default false,
  drop constraint ghost_direct_messages_body_check,
  add check (
    (not encrypted and char_length(trim(body)) between 1 and 4000)
    or (encrypted and char_length(body)<=22000 and body ~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{23,}$')
  );
grant select(encrypted) on public.ghost_direct_messages to authenticated;

create or replace function public.send_ghost_direct_message(p_recipient_profile_id uuid,p_client_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
  sender_id uuid;
  conversation_id uuid;
  message_id uuid;
  content text:=coalesce(p_body,'');
begin
  if (select auth.uid()) is null or not lgn_private.is_active_member() then
    raise exception 'An active Ghost account is required' using errcode='42501';
  end if;
  select link.profile_id into sender_id from public.ghost_profile_links link
  join public.ghost_profiles g on g.id=link.profile_id
  where link.owner_id=(select auth.uid()) and g.deleted_at is null;
  if sender_id is null or p_recipient_profile_id is null or sender_id=p_recipient_profile_id
    or p_client_id is null or char_length(content)>22000
    or content !~ '^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{23,}$' then
    raise exception 'An encrypted message envelope is required' using errcode='22023';
  end if;

  -- A response lost after a successful send can be retried with the same ID.
  select m.id into message_id from public.ghost_direct_messages m
  join public.ghost_dm_threads t on t.id=m.thread_id
  where m.sender_profile_id=sender_id and m.client_id=p_client_id and m.body=content
    and t.first_profile_id=least(sender_id,p_recipient_profile_id)
    and t.second_profile_id=greatest(sender_id,p_recipient_profile_id);
  if found then return message_id; end if;

  -- Lock the connection so a send cannot race past a disconnect.
  perform 1 from public.ghost_collaboration_requests r
  where r.status='accepted'
    and least(r.sender_profile_id,r.recipient_profile_id)=least(sender_id,p_recipient_profile_id)
    and greatest(r.sender_profile_id,r.recipient_profile_id)=greatest(sender_id,p_recipient_profile_id)
  for update;
  if not found or not exists (
    select 1 from public.ghost_profiles g
    join lgn_private.member_access a on a.user_id=g.owner_id
    join auth.users u on u.id=g.owner_id
    where g.id=p_recipient_profile_id and g.deleted_at is null and not a.suspended
      and u.deleted_at is null and u.email_confirmed_at is not null
  ) then
    raise exception 'An active mutual connection is required to send a message' using errcode='42501';
  end if;

  if (select count(*) from public.ghost_dm_identity_keys
      where profile_id in (sender_id,p_recipient_profile_id))<>2 then
    raise exception 'Both Ghosts must enable message encryption' using errcode='42501';
  end if;

  insert into public.ghost_dm_threads(first_profile_id,second_profile_id)
  values(least(sender_id,p_recipient_profile_id),greatest(sender_id,p_recipient_profile_id))
  on conflict(first_profile_id,second_profile_id) do nothing;
  select id into conversation_id from public.ghost_dm_threads
  where first_profile_id=least(sender_id,p_recipient_profile_id)
    and second_profile_id=greatest(sender_id,p_recipient_profile_id);

  insert into public.ghost_direct_messages(thread_id,sender_profile_id,client_id,body,encrypted)
  values(conversation_id,sender_id,p_client_id,content,true)
  on conflict(sender_profile_id,client_id) do nothing returning id into message_id;
  if message_id is null then
    select id into message_id from public.ghost_direct_messages
    where sender_profile_id=sender_id and client_id=p_client_id
      and thread_id=conversation_id and body=content;
    if message_id is null then
      raise exception 'This send ID is already in use' using errcode='22023';
    end if;
    return message_id;
  end if;

  update public.ghost_dm_threads set updated_at=clock_timestamp() where id=conversation_id;
  perform lgn_private.emit_ghost_notification(p_recipient_profile_id,'collaboration','direct_message_received',
    'New direct message','Open Messages to read it.','/ghost-space?section=messages&with='||sender_id);
  return message_id;
end $fn$;
