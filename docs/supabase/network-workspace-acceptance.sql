-- Synthetic development fixtures. Always rolls back.
begin;
create temp table nw_users(k text primary key,id uuid) on commit drop;
create temp table nw_results(label text primary key,passed boolean not null) on commit drop;
grant select on nw_users to authenticated;
grant insert,select on nw_results to authenticated,anon;
insert into nw_users values ('a',gen_random_uuid()),('b',gen_random_uuid()),('other',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','network-qa-'||k||'@example.invalid',now(),now(),now() from nw_users;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from nw_users where k='b'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'NetworkQAReceiver' from nw_users where k='b';
select set_config('request.jwt.claim.sub',(select id::text from nw_users where k='a'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'NetworkQASender' from nw_users where k='a';
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA request','Synthetic collaboration request'
from public.ghost_profiles a cross join public.ghost_profiles b
where a.handle='NetworkQASender' and b.handle='NetworkQAReceiver';
insert into public.ghost_saved_searches(profile_id,name,query)
select id,'QA search','test' from public.ghost_profiles where handle='NetworkQASender';
insert into nw_results select 'sender reads their pending request',count(*)=1
from public.ghost_collaboration_requests where subject='QA request' and status='pending';
insert into nw_results select 'owner reads saved search',count(*)=1 from public.ghost_saved_searches where name='QA search';
do $qa$
begin
 update public.ghost_collaboration_requests set status='accepted' where subject='QA request';
 raise sqlstate 'LGN01';
exception
 when insufficient_privilege then insert into nw_results values ('sender cannot accept their own request',true);
 when sqlstate 'LGN01' then insert into nw_results values ('sender cannot accept their own request',false);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from nw_users where k='other'),true);
insert into nw_results select 'unrelated Ghost cannot read requests or searches',
 (select count(*)=0 from public.ghost_collaboration_requests where subject='QA request')
 and (select count(*)=0 from public.ghost_saved_searches where name='QA search');
select set_config('request.jwt.claim.sub',(select id::text from nw_users where k='b'),true);
do $qa$
begin
 insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
 select b.id,a.id,'Duplicate','Synthetic reverse request'
 from public.ghost_profiles a cross join public.ghost_profiles b
 where a.handle='NetworkQASender' and b.handle='NetworkQAReceiver';
 raise sqlstate 'LGN01';
exception
 when unique_violation then insert into nw_results values ('one pending request per pair in either direction',true);
 when sqlstate 'LGN01' then insert into nw_results values ('one pending request per pair in either direction',false);
end $qa$;
update public.ghost_collaboration_requests set status='accepted' where subject='QA request';
insert into nw_results select 'recipient can accept',count(*)=1
from public.ghost_collaboration_requests where subject='QA request' and status='accepted';
with changed as (update public.ghost_collaboration_requests set status='declined' where subject='QA request' returning id)
insert into nw_results select 'resolved requests cannot be reopened',count(*)=0 from changed;
select set_config('request.jwt.claim.sub',(select id::text from nw_users where k='a'),true);
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA withdrawal','Synthetic follow-up'
from public.ghost_profiles a cross join public.ghost_profiles b
where a.handle='NetworkQASender' and b.handle='NetworkQAReceiver';
update public.ghost_collaboration_requests set status='withdrawn' where subject='QA withdrawal';
insert into nw_results select 'sender can withdraw a pending request',count(*)=1
from public.ghost_collaboration_requests where subject='QA withdrawal' and status='withdrawn';
set local role anon;
insert into nw_results values('anonymous cannot access private Network tables',
 not has_table_privilege('anon','public.ghost_collaboration_requests','SELECT')
 and not has_table_privilege('anon','public.ghost_saved_searches','SELECT'));
reset role;
do $qa$
declare failures text;
begin
 select string_agg(label,', ') into failures from nw_results where not passed;
 if failures is not null then raise exception 'Network checks failed: %',failures; end if;
end $qa$;
select label,passed from nw_results order by label;
rollback;
