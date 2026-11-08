-- Direct messages are private to a pair of Ghosts. A mutual connection is
-- required to send. Disconnecting leaves the existing conversation readable.
create table public.ghost_dm_threads (
  id uuid primary key default gen_random_uuid(),
  first_profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  second_profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique(first_profile_id,second_profile_id),
  check(first_profile_id<second_profile_id)
);
create index ghost_dm_threads_second_idx on public.ghost_dm_threads(second_profile_id,updated_at desc);
create table public.ghost_direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ghost_dm_threads(id) on delete restrict,
  sender_profile_id uuid not null references public.ghost_profiles(id) on delete restrict,
  client_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique(sender_profile_id,client_id)
);
create index ghost_direct_messages_thread_idx on public.ghost_direct_messages(thread_id,created_at desc,id desc);
alter table public.ghost_dm_threads enable row level security;
alter table public.ghost_direct_messages enable row level security;
revoke all on public.ghost_dm_threads,public.ghost_direct_messages from public,anon,authenticated;
grant select on public.ghost_dm_threads to authenticated;
grant select(id,thread_id,sender_profile_id,body,created_at) on public.ghost_direct_messages to authenticated;
create policy "active conversation participants read threads" on public.ghost_dm_threads for select to authenticated
  using ((select lgn_private.is_active_member()) and (
    first_profile_id in (select profile_id from public.ghost_profile_links)
    or second_profile_id in (select profile_id from public.ghost_profile_links)));
create policy "active conversation participants read messages" on public.ghost_direct_messages for select to authenticated
  using (exists (select 1 from public.ghost_dm_threads t where t.id=thread_id));

create function public.send_ghost_direct_message(p_recipient_profile_id uuid,p_client_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare
  sender_id uuid;
  conversation_id uuid;
  message_id uuid;
  content text:=trim(coalesce(p_body,''));
begin
  if (select auth.uid()) is null or not lgn_private.is_active_member() then
    raise exception 'An active Ghost account is required' using errcode='42501';
  end if;
  select link.profile_id into sender_id from public.ghost_profile_links link
  join public.ghost_profiles g on g.id=link.profile_id
  where link.owner_id=(select auth.uid()) and g.deleted_at is null;
  if sender_id is null or p_recipient_profile_id is null or sender_id=p_recipient_profile_id
    or p_client_id is null or char_length(content) not between 1 and 4000 then
    raise exception 'A recipient and a message of 1 to 4000 characters are required' using errcode='22023';
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

  insert into public.ghost_dm_threads(first_profile_id,second_profile_id)
  values(least(sender_id,p_recipient_profile_id),greatest(sender_id,p_recipient_profile_id))
  on conflict(first_profile_id,second_profile_id) do nothing;
  select id into conversation_id from public.ghost_dm_threads
  where first_profile_id=least(sender_id,p_recipient_profile_id)
    and second_profile_id=greatest(sender_id,p_recipient_profile_id);

  insert into public.ghost_direct_messages(thread_id,sender_profile_id,client_id,body)
  values(conversation_id,sender_id,p_client_id,content)
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
revoke all on function public.send_ghost_direct_message(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.send_ghost_direct_message(uuid,uuid,text) to authenticated;

-- Stream thread activity only. Clients re-read message bodies via RLS rather
-- than putting private message text in Realtime payloads.
alter publication supabase_realtime add table public.ghost_dm_threads;
