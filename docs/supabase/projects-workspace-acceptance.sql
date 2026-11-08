-- Development only. Synthetic project fixtures are rolled back.
begin;
create temp table qa_project_users(k text primary key,id uuid) on commit drop;
create temp table qa_project_results(name text primary key,passed boolean not null) on commit drop;
grant select on qa_project_users to authenticated;
grant select,insert on qa_project_results to authenticated,anon;
insert into qa_project_users values('owner',gen_random_uuid()),('member',gen_random_uuid()),('outsider',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','project-qa-'||k||'@example.invalid',now(),now(),now() from qa_project_users;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'ProjectQAOwner' from qa_project_users where k='owner';
insert into public.ghost_projects(profile_id,title)
select id,'QA project' from public.ghost_profiles where handle='ProjectQAOwner';
insert into public.ghost_project_tasks(project_id,title)
select id,'QA private task' from public.ghost_projects where title='QA project';
set local role anon;
insert into qa_project_results select 'private project is invisible to visitors',count(*)=0
from public.ghost_projects where title='QA project';
insert into qa_project_results values('anonymous role has no access to tasks or membership',
  not has_table_privilege('anon','public.ghost_project_tasks','SELECT')
  and not has_table_privilege('anon','public.ghost_project_members','SELECT'));
set local role authenticated;
update public.ghost_projects set visibility='public',recruiting=true where title='QA project';
set local role anon;
insert into qa_project_results select 'public brief is visible',count(*)=1
from public.ghost_projects where title='QA project';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'ProjectQAMember' from qa_project_users where k='member';
insert into public.ghost_project_members(project_id,profile_id)
select p.id,g.id from public.ghost_projects p cross join public.ghost_profiles g
where p.title='QA project' and g.handle='ProjectQAMember';
insert into qa_project_results select 'request defaults to pending',count(*)=1
from public.ghost_project_members where status='requested';
with changed as (update public.ghost_project_members set status='accepted' returning project_id)
insert into qa_project_results select 'applicant cannot self-approve',count(*)=0 from changed;
insert into qa_project_results select 'pending applicant cannot read tasks',count(*)=0
from public.ghost_project_tasks where title='QA private task';
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
update public.ghost_project_members set status='accepted'
where project_id=(select id from public.ghost_projects where title='QA project');
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into qa_project_results select 'accepted member can read tasks',count(*)=1
from public.ghost_project_tasks where title='QA private task';
with changed as (update public.ghost_project_tasks set status='complete' returning id)
insert into qa_project_results select 'member cannot edit maintainer task',count(*)=0 from changed;
with changed as (update public.ghost_projects set title='QA unauthorized' where title='QA project' returning id)
insert into qa_project_results select 'member cannot edit project brief',count(*)=0 from changed;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='outsider'),true);
insert into qa_project_results select 'unrelated member cannot read memberships or tasks',
  (select count(*)=0 from public.ghost_project_members)
  and (select count(*)=0 from public.ghost_project_tasks where title='QA private task');
reset role;
update lgn_private.member_access set suspended=true where user_id=(select id from qa_project_users where k='owner');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
with changed as (update public.ghost_projects set title='QA suspended' where title='QA project' returning id)
insert into qa_project_results select 'suspended owner cannot edit project',count(*)=0 from changed;
reset role;
do $qa$
declare failures text;
begin
  select string_agg(name,', ') into failures from qa_project_results where not passed;
  if failures is not null then raise exception 'Projects checks failed: %',failures; end if;
end $qa$;
select name,passed from qa_project_results order by name;
rollback;
