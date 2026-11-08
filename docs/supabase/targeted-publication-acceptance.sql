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
-- Keep the publication URL and history through a clean revision.
create temp table qa_revision_target on commit drop as
select id,published_at from public.ghost_contributions where title='QA ordinary research';
grant select on qa_revision_target to anon;
update public.ghost_contributions
set summary='A revised research summary',status='submitted'
where id=(select id from qa_revision_target);
set local role anon;
insert into qa_bot_out
select 'clean published revision keeps its URL and original publication time',
  count(c.id)=1 and bool_and(c.version=2 and c.published_at=t.published_at
    and c.summary='A revised research summary')
from public.ghost_contributions c join qa_revision_target t on c.id=t.id;
set local role authenticated;
insert into qa_bot_out
select 'clean revision preserves both version snapshots',count(r.id)=2
from public.ghost_contribution_revisions r join qa_revision_target t on r.contribution_id=t.id;
do $qa$
begin
  update public.ghost_contributions set summary='Unscreened edit'
    where id=(select id from qa_revision_target);
  raise sqlstate 'LGN01';
exception
  when insufficient_privilege then
    insert into qa_bot_out values ('published work cannot be edited without screening',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('published work cannot be edited without screening',false);
end $qa$;
update public.ghost_contributions
set code='-----BEGIN PRIVATE KEY----- synthetic revision',status='submitted'
where id=(select id from qa_revision_target);
set local role anon;
insert into qa_bot_out
select 'held published revision is not publicly readable',count(c.id)=0
from public.ghost_contributions c join qa_revision_target t on c.id=t.id;
set local role authenticated;
insert into qa_bot_out
select 'held published revision enters the existing review queue',count(c.id)=1
from public.ghost_contributions c join public.ghost_contribution_triage t
  on t.contribution_id=c.id and t.version=c.version
where c.id=(select id from qa_revision_target) and c.status='submitted' and t.resolution='pending';
update public.ghost_contributions set code='',status='submitted' where id=(select id from qa_revision_target);
insert into qa_bot_out
select 'corrected published revision restores the same public URL',count(id)=1
from public.ghost_contributions where id=(select id from qa_revision_target)
  and status='published' and version=4;
select public.delete_ghost_contribution(
  (select id from public.ghost_contributions where title='QA ordinary research'),4);
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
select 'delete retains an internal tombstone and version history',count(*)=4
from public.ghost_contributions c join public.ghost_contribution_revisions r on r.contribution_id=c.id
where c.title='QA ordinary research' and c.deleted_at is not null;
reset role;
update lgn_private.member_access set role='moderator'
where user_id=(select id from qa_bot_users where k='other');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
insert into public.ghost_contribution_reports(contribution_id,subject,body)
select id,'QA private report','Synthetic report for authorization checks'
from public.ghost_contributions where title='QA secret';
insert into qa_bot_out
select 'reporter cannot list the private report',count(id)=0
from public.ghost_contribution_reports where subject='QA private report';
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
do $qa$
begin
  perform public.resolve_contribution_report(null,'taken_down','Unauthorized attempt');
  raise sqlstate 'LGN01';
exception
  when insufficient_privilege then
    insert into qa_bot_out values ('reviewer cannot take down published work',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('reviewer cannot take down published work',false);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='other'),true);
insert into qa_bot_out
select 'moderator can read the reported version',count(id)=1 and bool_and(contribution_version=3)
from public.ghost_contribution_reports where subject='QA private report';
select public.resolve_contribution_report(
  (select id from public.ghost_contribution_reports where subject='QA private report'),
  'taken_down','Synthetic authorization check');
insert into qa_bot_out
select 'moderator decision is recorded with a reason',count(id)=1
from public.ghost_contribution_reports where subject='QA private report'
  and outcome='taken_down' and decision_note='Synthetic authorization check' and decided_at is not null;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
insert into public.ghost_contribution_reports(contribution_id,subject,body)
select id,'QA stale report','Synthetic report for a superseded version'
from public.ghost_contributions where title='QA artifact' and kind='malware_samples';
update public.ghost_contributions set summary='New published version',status='submitted'
where title='QA artifact' and kind='malware_samples';
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='other'),true);
do $qa$
begin
  perform public.resolve_contribution_report(
    (select id from public.ghost_contribution_reports where subject='QA stale report'),
    'taken_down','Stale decision attempt');
  raise sqlstate 'LGN01';
exception
  when serialization_failure then
    insert into qa_bot_out values ('report cannot remove a newer published revision',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('report cannot remove a newer published revision',false);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
insert into public.ghost_contribution_translations(contribution_id,version,language,title,source)
select id,version,'fr','Titre synthétique','human'
from public.ghost_contributions where title='QA artifact' and kind='malware_samples';
insert into public.ghost_contribution_text_attachments(contribution_id,version,filename,content)
select id,version,'source.html','<script>synthetic fixture</script>'
from public.ghost_contributions where title='QA artifact' and kind='malware_samples';
set local role anon;
insert into qa_bot_out select 'public can read a current translation and a literal text attachment',
  (select count(*)=1 from public.ghost_contribution_translations where title='Titre synthétique')
  and (select count(*)=1 from public.ghost_contribution_text_attachments
    where filename='source.html' and content='<script>synthetic fixture</script>');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
do $qa$
begin
  insert into public.ghost_contribution_translations(contribution_id,version,language,title,source)
  select id,version,'de','Synthetic foreign edit','human'
  from public.ghost_contributions where title='QA artifact' and kind='malware_samples';
  raise sqlstate 'LGN01';
exception
  when insufficient_privilege then
    insert into qa_bot_out values ('another member cannot add translation to public work',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('another member cannot add translation to public work',false);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
do $qa$
begin
  insert into public.ghost_contribution_text_attachments(contribution_id,version,filename,content)
  select id,version,'secret.txt','-----BEGIN PRIVATE KEY----- synthetic marker'
  from public.ghost_contributions where title='QA artifact' and kind='malware_samples';
  raise sqlstate 'LGN01';
exception
  when check_violation then
    insert into qa_bot_out values ('text attachments cannot bypass credential screening',true);
  when sqlstate 'LGN01' then
    insert into qa_bot_out values ('text attachments cannot bypass credential screening',false);
end $qa$;
update public.ghost_contributions set summary='New version without old materials',status='submitted'
where title='QA artifact' and kind='malware_samples';
set local role anon;
insert into qa_bot_out select 'older translations and attachments become private after revision',
  (select count(*)=0 from public.ghost_contribution_translations where title='Titre synthétique')
  and (select count(*)=0 from public.ghost_contribution_text_attachments where filename='source.html');
set local role anon;
insert into qa_bot_out
select 'takedown removes the reported article from public view',count(id)=0
from public.ghost_contributions where title='QA secret';
insert into qa_bot_out values ('anonymous cannot read or submit reports',
  not has_any_column_privilege('anon','public.ghost_contribution_reports','SELECT')
  and not has_any_column_privilege('anon','public.ghost_contribution_reports','INSERT'));
reset role;
do $qa$ declare failed text;
begin select string_agg(test,'; ') into failed from qa_bot_out where not passed;
if failed is not null then raise exception 'LGN bot checks failed: %',failed;end if;end $qa$;
select test,passed from qa_bot_out order by test;
rollback;
