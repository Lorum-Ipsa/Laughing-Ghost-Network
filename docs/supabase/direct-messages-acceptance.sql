-- Synthetic development fixtures. Always rolls back.
begin;
create temp table dm_users(k text primary key,id uuid) on commit drop;
create temp table dm_results(label text primary key,passed boolean not null) on commit drop;
grant select on dm_users to authenticated;
grant insert,select on dm_results to authenticated,anon;
insert into dm_users values ('a',gen_random_uuid()),('b',gen_random_uuid()),('other',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','dm-qa-'||k||'@example.invalid',now(),now(),now() from dm_users;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='b'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'DMQABeta' from dm_users where k='b';
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='a'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'DMQAAlpha' from dm_users where k='a';
do $qa$
begin
 perform public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQABeta'),gen_random_uuid(),'Unconnected attempt');
 raise sqlstate 'LGN01';
exception
 when insufficient_privilege then insert into dm_results values('unconnected Ghost cannot send',true);
 when sqlstate 'LGN01' then insert into dm_results values('unconnected Ghost cannot send',false);
end $qa$;
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA DM connection','Synthetic test request'
from public.ghost_profiles a cross join public.ghost_profiles b where a.handle='DMQAAlpha' and b.handle='DMQABeta';
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='b'),true);
update public.ghost_collaboration_requests set status='accepted' where subject='QA DM connection';
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='a'),true);
select public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQABeta'),
 '11111111-1111-4111-8111-111111111111','Private synthetic message');
select public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQABeta'),
 '11111111-1111-4111-8111-111111111111','Private synthetic message');
insert into dm_results select 'retry produces exactly one message',count(id)=1
from public.ghost_direct_messages where body='Private synthetic message';
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='b'),true);
insert into dm_results select 'recipient reads message and gets one generic notice',
 (select count(id)=1 from public.ghost_direct_messages where body='Private synthetic message')
 and (select count(id)=1 from public.ghost_notifications where type='direct_message_received'
   and body not like '%Private synthetic%' and link like '/ghost-space?section=messages&with=%');
select public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQAAlpha'),gen_random_uuid(),'Reply from Beta');
insert into dm_results select 'both directions share one conversation',
 count(distinct thread_id)=1 and count(id)=2 from public.ghost_direct_messages;
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='other'),true);
insert into dm_results select 'third account cannot read threads or bodies',
 (select count(id)=0 from public.ghost_dm_threads) and (select count(id)=0 from public.ghost_direct_messages);
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='a'),true);
update public.ghost_collaboration_requests set status='disconnected' where subject='QA DM connection';
insert into dm_results select 'disconnect preserves history',count(id)=2 from public.ghost_direct_messages;
do $qa$
begin
 perform public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQABeta'),gen_random_uuid(),'Disconnected attempt');
 raise sqlstate 'LGN01';
exception
 when insufficient_privilege then insert into dm_results values('disconnect prevents new messages',true);
 when sqlstate 'LGN01' then insert into dm_results values('disconnect prevents new messages',false);
end $qa$;
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA DM reconnection','Synthetic reconnect'
from public.ghost_profiles a cross join public.ghost_profiles b where a.handle='DMQAAlpha' and b.handle='DMQABeta';
select set_config('request.jwt.claim.sub',(select id::text from dm_users where k='b'),true);
update public.ghost_collaboration_requests set status='accepted' where subject='QA DM reconnection';
select public.send_ghost_direct_message((select id from public.ghost_profiles where handle='DMQAAlpha'),gen_random_uuid(),'Reconnected message');
insert into dm_results select 'reconnecting resumes the original conversation',
 count(distinct thread_id)=1 and count(id)=3 from public.ghost_direct_messages;
set local role anon;
insert into dm_results values ('visitors cannot read messages or invoke send',
 not has_any_column_privilege('anon','public.ghost_direct_messages','SELECT')
 and not has_function_privilege('anon','public.send_ghost_direct_message(uuid,uuid,text)','EXECUTE'));
reset role;
insert into dm_results select 'Realtime publishes only conversation activity',
 (select count(*)=1 from pg_publication_tables where pubname='supabase_realtime' and tablename='ghost_dm_threads')
 and (select count(*)=0 from pg_publication_tables where pubname='supabase_realtime' and tablename='ghost_direct_messages');
do $qa$
declare failures text;
begin
 select string_agg(label,', ') into failures from dm_results where not passed;
 if failures is not null then raise exception 'DM checks failed: %',failures; end if;
end $qa$;
select label,passed from dm_results order by label;
rollback;
