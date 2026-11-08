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
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
update public.ghost_project_tasks set assigned_profile_id=(
  select id from public.ghost_profiles where handle='ProjectQAMember'
) where title='QA private task';
insert into public.ghost_project_updates(project_id,title,body)
select id,'QA progress update','Synthetic milestone progress'
from public.ghost_projects where title='QA project';
set local role anon;
insert into qa_project_results values('visitors have no project update access',
  not has_table_privilege('anon','public.ghost_project_updates','SELECT'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into qa_project_results select 'accepted member reads progress updates',count(*)=1
from public.ghost_project_updates where title='QA progress update';
select public.update_assigned_project_task_status(
  (select id from public.ghost_project_tasks where title='QA private task'),'open','in_progress');
insert into qa_project_results select 'assignee changes their task status',count(*)=1
from public.ghost_project_tasks where title='QA private task' and status='in_progress';
do $qa$
begin
  perform public.update_assigned_project_task_status(
    (select id from public.ghost_project_tasks where title='QA private task'),'open','complete');
  raise sqlstate 'LGN01';
exception
  when insufficient_privilege then
    insert into qa_project_results values ('stale task status cannot overwrite current status',true);
  when sqlstate 'LGN01' then
    insert into qa_project_results values ('stale task status cannot overwrite current status',false);
end $qa$;
do $qa$
begin
  insert into public.ghost_project_updates(project_id,title,body)
    select id,'Unauthorized update','Synthetic write attempt'
    from public.ghost_projects where title='QA project';
  raise sqlstate 'LGN01';
exception
  when insufficient_privilege then
    insert into qa_project_results values ('accepted member cannot post maintainer updates',true);
  when sqlstate 'LGN01' then
    insert into qa_project_results values ('accepted member cannot post maintainer updates',false);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
delete from public.ghost_project_members
where project_id=(select id from public.ghost_projects where title='QA project');
insert into qa_project_results select 'removing a member clears their task assignment',count(*)=1
from public.ghost_project_tasks where title='QA private task' and assigned_profile_id is null;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into qa_project_results select 'former member loses task and update access',
  (select count(*)=0 from public.ghost_project_tasks where title='QA private task')
  and (select count(*)=0 from public.ghost_project_updates where title='QA progress update');
-- Deferred checks for roles, milestones, watches and invitations.
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
insert into public.ghost_project_roles(project_id,title)
select id,'QA posted role' from public.ghost_projects where title='QA project';
insert into public.ghost_project_milestones(project_id,title)
select id,'QA private milestone' from public.ghost_projects where title='QA project';
set local role anon;
insert into qa_project_results select 'public recruiting project exposes its open role',count(*)=1
from public.ghost_project_roles where title='QA posted role';
insert into qa_project_results values('visitors cannot see milestones or watches',
  not has_table_privilege('anon','public.ghost_project_milestones','SELECT')
  and not has_table_privilege('anon','public.ghost_project_watches','SELECT'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into public.ghost_project_watches(project_id,profile_id)
select p.id,g.id from public.ghost_projects p cross join public.ghost_profiles g
where p.title='QA project' and g.handle='ProjectQAMember';
insert into public.ghost_project_members(project_id,profile_id,role_id)
select r.project_id,g.id,r.id from public.ghost_project_roles r cross join public.ghost_profiles g
where r.title='QA posted role' and g.handle='ProjectQAMember';
insert into qa_project_results select 'member can request a posted role',count(*)=1
from public.ghost_project_members where role_id is not null and status='requested';
delete from public.ghost_project_members where status='requested';
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
insert into qa_project_results select 'maintainer cannot see a member watch',count(*)=0
from public.ghost_project_watches;
insert into public.ghost_project_members(project_id,profile_id,status)
select p.id,g.id,'invited' from public.ghost_projects p cross join public.ghost_profiles g
where p.title='QA project' and g.handle='ProjectQAMember';
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='outsider'),true);
with changed as (update public.ghost_project_members set status='accepted' where status='invited' returning project_id)
insert into qa_project_results select 'outsider cannot accept an invitation',count(*)=0 from changed;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='member'),true);
insert into qa_project_results select 'invitee cannot read private milestones before accepting',count(*)=0
from public.ghost_project_milestones where title='QA private milestone';
update public.ghost_project_members set status='accepted' where status='invited';
insert into qa_project_results select 'invitee can accept and read private milestones',count(*)=1
from public.ghost_project_milestones where title='QA private milestone';
with changed as (update public.ghost_project_milestones set completed=true returning id)
insert into qa_project_results select 'member cannot complete maintainer milestone',count(*)=0 from changed;
select set_config('request.jwt.claim.sub',(select id::text from qa_project_users where k='owner'),true);
update public.ghost_project_roles set is_open=false where title='QA posted role';
set local role anon;
insert into qa_project_results select 'closed role disappears from public view',count(*)=0
from public.ghost_project_roles where title='QA posted role';
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
