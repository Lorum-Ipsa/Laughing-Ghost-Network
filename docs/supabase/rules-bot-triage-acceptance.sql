-- Rules bot v1 acceptance. Run only in LGN development or disposable staging.
-- All synthetic identities, submissions and review events are rolled back.
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
'Routine','Normal research','submitted' from qa_bot_users where k='a';
insert into qa_bot_out select 'R001 routes ordinary contributions to human review',count(*)=1
from public.ghost_contribution_triage t join public.ghost_contributions c on c.id=t.contribution_id
where c.title='Routine' and t.recommendation='human_review' and t.resolution='not_required';
insert into public.ghost_contributions(owner_id,profile_id,title,summary,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
'Routine','Normal research','submitted' from qa_bot_users where k='a';
insert into qa_bot_out select 'R201 exact same-author duplicate is a proposed rejection',count(*)=1
from public.ghost_contribution_triage t join public.ghost_contributions c on c.id=t.contribution_id
where c.title='Routine' and t.recommendation='reject_candidate'
and t.signals @> '[{"rule":"R201"}]'::jsonb;
insert into public.ghost_contributions(owner_id,profile_id,title,code,kind,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
'Sensitive sample','harmless synthetic artifact','malware_samples','submitted'
from qa_bot_users where k='a';
insert into qa_bot_out select 'R302 sensitive artifacts require investigation',count(*)=1
from public.ghost_contribution_triage t join public.ghost_contributions c on c.id=t.contribution_id
where c.title='Sensitive sample' and t.recommendation='investigate'
and t.resolution='pending' and t.signals @> '[{"rule":"R302"}]'::jsonb;
insert into public.ghost_contributions(owner_id,profile_id,title,body,status)
select id,(select id from public.ghost_profiles where handle='BotQA//Member'),
'Synthetic key','-----BEGIN PRIVATE KEY----- this is fake','submitted' from qa_bot_users where k='a';
insert into qa_bot_out select 'R301 potential credentials trigger a private escalation without logging secrets',count(*)=1
from public.ghost_contribution_triage t join public.ghost_contributions c on c.id=t.contribution_id
where c.title='Synthetic key' and t.recommendation='investigate'
and t.signals @> '[{"rule":"R301"}]'::jsonb
and t.signals::text not like '%this is fake%';
insert into qa_bot_out select 'author can read own four bot decisions',count(*)=4
from public.ghost_contribution_triage t where t.contribution_id in
(select id from public.ghost_contributions c where c.profile_id=
 (select id from public.ghost_profiles where handle='BotQA//Member'));
insert into qa_bot_out values('ordinary members cannot modify bot findings',
not has_table_privilege('authenticated','public.ghost_contribution_triage','UPDATE'));
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='other'),true);
insert into qa_bot_out select 'other Ghost cannot read private triage',count(*)=0
from public.ghost_contribution_triage;
set local role anon;
insert into qa_bot_out values('anonymous users cannot read bot triage',
not has_table_privilege('anon','public.ghost_contribution_triage','SELECT'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
insert into qa_bot_out select 'reviewers see only the four synthetic case reports in the author scope',count(*)=4
from public.ghost_contribution_triage t where t.contribution_id in
(select id from public.ghost_contributions c where c.profile_id=
 (select id from public.ghost_profiles where handle='BotQA//Member'));
do $qa$
begin
 perform public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Sensitive sample'),1,'published','');
 insert into qa_bot_out values('investigation cannot be bypassed by publish',false);
exception when insufficient_privilege then
 insert into qa_bot_out values('investigation cannot be bypassed by publish',true);
end $qa$;
do $qa$
begin
 perform public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Sensitive sample'),1,'triage_cleared','');
 insert into qa_bot_out values('human clearance needs a reason',false);
exception when invalid_parameter_value then
 insert into qa_bot_out values('human clearance needs a reason',true);
end $qa$;
do $qa$
begin
 perform public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Sensitive sample'),1,'triage_cleared','Verified as authorized synthetic test');
end $qa$;
insert into qa_bot_out select 'human clearance is logged and version scoped',
(select count(*)=1 from public.ghost_contribution_triage where resolution='cleared'
 and resolution_note='Verified as authorized synthetic test')
and (select count(*)=1 from public.ghost_contribution_reviews where action='triage_cleared');
do $qa$
begin
 perform public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Sensitive sample'),1,'published','Authorized test approved');
end $qa$;
insert into qa_bot_out select 'cleared sample may be human published',count(*)=1
from public.ghost_contributions where title='Sensitive sample' and status='published';
-- Verify clearance does not survive revision and resubmission.
select public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Synthetic key'),
  1, 'triage_cleared', 'Verified synthetic marker');
select public.review_ghost_contribution(
  (select id from public.ghost_contributions where title='Synthetic key'),
  1, 'revision_requested', 'Add context for the synthetic marker');
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='a'),true);
update public.ghost_contributions set summary='Revised synthetic test', status='submitted'
  where title='Synthetic key';
select set_config('request.jwt.claim.sub',(select id::text from qa_bot_users where k='r'),true);
insert into qa_bot_out
select 'resubmission gets a fresh pending flag while the prior clearance stays recorded',
  count(*) filter (where t.version=1 and t.resolution='cleared')=1
  and count(*) filter (where t.version=c.version and t.version>1
    and t.recommendation='investigate' and t.resolution='pending')=1
from public.ghost_contribution_triage t
join public.ghost_contributions c on c.id=t.contribution_id
where c.title='Synthetic key';
do $qa$
declare
  work_id uuid;
  current_version integer;
  expected_version integer;
  test_name text;
begin
  select id, version into strict work_id, current_version
  from public.ghost_contributions where title='Synthetic key';
  begin
    perform public.review_ghost_contribution(work_id, current_version, 'published', '');
    insert into qa_bot_out values ('earlier clearance cannot authorize a resubmission', false);
  exception when insufficient_privilege then
    insert into qa_bot_out values ('earlier clearance cannot authorize a resubmission', true);
  end;
  foreach expected_version in array array[1, null::integer] loop
    test_name := case when expected_version is null then 'null version cannot clear an automated flag'
      else 'stale version cannot clear a resubmission' end;
    begin
      perform public.review_ghost_contribution(work_id, expected_version, 'triage_cleared', 'Invalid clearance');
      -- Roll back an unexpected successful clearance before the next attempt.
      raise sqlstate 'LGN01';
    exception
      when serialization_failure then insert into qa_bot_out values (test_name, true);
      when sqlstate 'LGN01' then insert into qa_bot_out values (test_name, false);
    end;
  end loop;
end $qa$;
reset role;
do $qa$ declare failed text;
begin select string_agg(test,'; ') into failed from qa_bot_out where not passed;
if failed is not null then raise exception 'LGN bot checks failed: %',failed;end if;end $qa$;
select test,passed from qa_bot_out order by test;
rollback;
