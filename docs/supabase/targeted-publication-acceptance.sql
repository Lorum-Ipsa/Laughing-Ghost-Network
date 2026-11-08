-- Development only. Synthetic accounts and artifacts are rolled back.
begin;
create temp table qa_bot_users(k text primary key,id uuid) on commit drop;
create temp table qa_bot_out(test text primary key,passed boolean not null) on commit drop;
grant select on qa_bot_users to authenticated,anon;
grant select,insert on qa_bot_out to authenticated,anon;
insert into qa_bot_users values('a',gen_random_uuid()),('r',gen_random_uuid()),('other',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','bot-acceptance-'||k||'@example.invalid',now(),now(),now()
from qa_bot_users;
update lgn_private.member_access set role='reviewer'
where user_id=(select id from qa_bot_users where k='r');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'BotQA//Member' from qa_bot_users where k='a';

insert into public.ghost_contributions(owner_id,profile_id,title,summary,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
  'QA ordinary research','Synthetic research summary','submitted'
from qa_bot_users where k='a';
insert into public.ghost_contributions(owner_id,profile_id,title,kind,code,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
  'QA artifact',kind,'<script>throw new Error("inert sample")</script>','draft'
from qa_bot_users cross join (values ('malware_samples'),('exploit_pocs'),
  ('attack_simulations'),('adversary_emulation')) as fixtures(kind) where k='a';
update public.ghost_contributions set status='submitted' where title='QA artifact';
insert into qa_bot_out
select 'research categories publish from a draft without a category flag',
  count(*)=4 and bool_and(status='published' and version=2 and published_at is not null)
from public.ghost_contributions where title='QA artifact';
insert into qa_bot_out
select 'published draft version has an immutable snapshot',
  count(*)=4
from public.ghost_contribution_revisions r join public.ghost_contributions c
  on c.id=r.contribution_id and c.version=r.version
where c.title='QA artifact';
insert into public.ghost_contributions(owner_id,profile_id,title,kind,code,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
  'QA secret','malware_samples','-----BEGIN PRIVATE KEY----- fake marker','submitted'
from qa_bot_users where k='a';
insert into qa_bot_out
select 'a specific concern holds a version without logging the sample text',
  count(*)=1 and bool_and(c.status='submitted' and c.published_at is null
    and t.recommendation='investigate' and t.resolution='pending'
    and t.policy_version='LGN-TRIAGE-2' and t.signals @> '[{"rule":"R301"}]'
    and t.signals::text not like '%fake marker%')
from public.ghost_contributions c join public.ghost_contribution_triage t
  on t.contribution_id=c.id and t.version=c.version
where c.title='QA secret';
do $qa$
begin
  update public.ghost_contributions set status='published' where title='QA secret';
  insert into qa_bot_out values ('direct author publish cannot bypass screening',false);
exception when insufficient_privilege then
  insert into qa_bot_out values ('direct author publish cannot bypass screening',true);
end $qa$;
set local role anon;
insert into qa_bot_out select 'ordinary research is immediately public',
  count(id)=1 from public.ghost_contributions where title='QA ordinary research';
insert into qa_bot_out select 'the public can read the code as stored text',
  count(id)=4 and bool_and(code='<script>throw new Error("inert sample")</script>')
  from public.ghost_contributions where title='QA artifact';
insert into qa_bot_out select 'held work is private to visitors',
  count(id)=0 from public.ghost_contributions where title='QA secret';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
do $qa$
begin
  perform public.review_ghost_contribution(
    (select id from public.ghost_contributions where title='QA secret'),1,'published','');
  insert into qa_bot_out values ('reviewer cannot publish before clearance',false);
exception when insufficient_privilege then
  insert into qa_bot_out values ('reviewer cannot publish before clearance',true);
end $qa$;
do $qa$
begin
  perform public.review_ghost_contribution(
    (select id from public.ghost_contributions where title='QA secret'),
    null,'triage_cleared','Invalid version');
  raise sqlstate 'LGN01';
exception
  when serialization_failure then
    insert into qa_bot_out values ('null version cannot clear held work',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('null version cannot clear held work',false);
end $qa$;
select public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='QA secret'),1,
  'revision_requested','Remove the synthetic marker');
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
update public.ghost_contributions set code='Sanitized sample',status='submitted' where title='QA secret';
insert into qa_bot_out select 'a corrected submission publishes without another approval',
  count(*)=1 and bool_and(status='published' and version=3)
from public.ghost_contributions where title='QA secret';
select public.delete_ghost_contribution(
  (select id from public.ghost_contributions where title='QA ordinary research'),1);
insert into qa_bot_out
select 'owner no longer sees deleted published work',count(id)=0
from public.ghost_contributions where title='QA ordinary research';
set local role anon;
insert into qa_bot_out
select 'public no longer sees deleted published work',count(id)=0
from public.ghost_contributions where title='QA ordinary research';
insert into qa_bot_out values ('anonymous callers cannot invoke deletion',
  not has_function_privilege('anon','public.delete_ghost_contribution(uuid,integer)','execute'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='other'),true);
do $qa$
begin
  perform public.delete_ghost_contribution(
    (select min(id::text)::uuid from public.ghost_contributions where title='QA artifact'),2);
  insert into qa_bot_out values ('another member cannot delete public work',false);
exception when insufficient_privilege then
  insert into qa_bot_out values ('another member cannot delete public work',true);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
do $qa$
begin
  perform public.delete_ghost_contribution(
    (select id from public.ghost_contributions where title='QA secret'),null);
  insert into qa_bot_out values ('missing version cannot delete work',false);
exception when serialization_failure then
  insert into qa_bot_out values ('missing version cannot delete work',true);
end $qa$;
insert into public.ghost_contributions(owner_id,profile_id,title,code,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
  'QA delete held','-----BEGIN PRIVATE KEY----- fake marker','submitted'
from qa_bot_users where k='a';
do $qa$
declare
  work_id uuid;
begin
  select id into strict work_id from public.ghost_contributions where title='QA delete held';
  insert into qa_bot_out values ('owner can delete held work and safely retry',
    public.delete_ghost_contribution(work_id,1)
    and public.delete_ghost_contribution(work_id,1));
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
insert into qa_bot_out
select 'deleted held work disappears from the review queue',count(id)=0
from public.ghost_contributions where title='QA delete held';
insert into qa_bot_out values ('members cannot write tombstones directly',
  not has_column_privilege('authenticated','public.ghost_contributions','deleted_at','UPDATE'));
reset role;
insert into qa_bot_out
select 'delete retains an internal tombstone and version history',count(*)=1
from public.ghost_contributions c join public.ghost_contribution_revisions r on r.contribution_id=c.id
where c.title='QA ordinary research' and c.deleted_at is not null;
reset role;
do $qa$ declare failed text;
begin select string_agg(test,'; ') into failed from qa_bot_out where not passed;
if failed is not null then raise exception 'LGN bot checks failed: %',failed;end if;end $qa$;
select test,passed from qa_bot_out order by test;
rollback;
