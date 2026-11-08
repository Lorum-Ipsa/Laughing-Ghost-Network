-- Synthetic development fixtures. Always rolls back.
begin;
create temp table nt_users(k text primary key,id uuid) on commit drop;
create temp table nt_results(label text primary key,passed boolean not null) on commit drop;
grant select on nt_users to authenticated;
grant insert,select on nt_results to authenticated,anon;
insert into nt_users values ('a',gen_random_uuid()),('b',gen_random_uuid()),('other',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','notif-qa-'||k||'@example.invalid',now(),now(),now() from nt_users;
update lgn_private.member_access set role='reviewer' where user_id=(select id from nt_users where k='b');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='b'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'NotifQABeta' from nt_users where k='b';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='a'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'NotifQAAlpha' from nt_users where k='a';
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA request','Never copy this private message' from public.ghost_profiles a cross join public.ghost_profiles b
where a.handle='NotifQAAlpha' and b.handle='NotifQABeta';
insert into nt_results select 'sender cannot see recipient notice',count(*)=0 from public.ghost_notifications where title='New collaboration request';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='b'),true);
insert into nt_results select 'recipient gets one unread generic notice',count(*)=1
from public.ghost_notifications where type='collaboration_request_received' and not read
  and body not like '%Never copy%' and link='/ghost-space?section=network';
update public.ghost_notifications set read=true,archived=true where type='collaboration_request_received';
insert into nt_results select 'recipient can mark read and archive',count(*)=1
from public.ghost_notifications where type='collaboration_request_received' and read and archived;
update public.ghost_collaboration_requests set status='accepted' where subject='QA request';
insert into public.ghost_notification_preferences(profile_id,collaboration)
select id,false from public.ghost_profiles where handle='NotifQABeta';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='a'),true);
insert into nt_results select 'sender receives request outcome',count(*)=1 from public.ghost_notifications where type='collaboration_request_updated';
update public.ghost_collaboration_requests set status='disconnected' where subject='QA request';
insert into public.ghost_collaboration_requests(sender_profile_id,recipient_profile_id,subject,message)
select a.id,b.id,'QA second request','Private follow-up' from public.ghost_profiles a cross join public.ghost_profiles b
where a.handle='NotifQAAlpha' and b.handle='NotifQABeta';
insert into public.ghost_projects(profile_id,title) select id,'QA notification project' from public.ghost_profiles where handle='NotifQAAlpha';
update public.ghost_projects set visibility='public' where title='QA notification project';
insert into public.ghost_project_members(project_id,profile_id,status)
select p.id,b.id,'invited' from public.ghost_projects p cross join public.ghost_profiles b
where p.title='QA notification project' and b.handle='NotifQABeta';
insert into public.ghost_table_talks(profile_id,title)
select id,'QA notification exercise' from public.ghost_profiles where handle='NotifQAAlpha';
update public.ghost_table_talks set status='open' where title='QA notification exercise';
insert into public.ghost_contributions(owner_id,profile_id,title,body,status)
select u.id,g.id,'QA notification contribution','-----BEGIN PRIVATE KEY----- synthetic marker','submitted'
from nt_users u cross join public.ghost_profiles g where u.k='a' and g.handle='NotifQAAlpha';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='b'),true);
insert into nt_results select 'disabled category suppresses new delivery only',count(*)=1
from public.ghost_notifications where type='collaboration_request_received';
insert into nt_results select 'project invitation delivers in a separate category',count(*)=1
from public.ghost_notifications where type='project_invitation' and category='projects';
insert into public.ghost_table_talk_members(talk_id,profile_id)
select t.id,b.id from public.ghost_table_talks t cross join public.ghost_profiles b
where t.title='QA notification exercise' and b.handle='NotifQABeta';
select public.review_ghost_contribution(
 (select id from public.ghost_contributions where title='QA notification contribution'),
 1,'revision_requested','Private reviewer reason');
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='a'),true);
insert into nt_results select 'review delivers without copying the note',count(*)=1
from public.ghost_notifications where type='work_revision_requested' and body not like '%Private reviewer%';
update public.ghost_table_talks set status='in_progress' where title='QA notification exercise';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='b'),true);
insert into nt_results select 'exercise start delivers to the registrant',count(*)=1
from public.ghost_notifications where category='table_talks' and title='Table Talk started';
select set_config('request.jwt.claim.sub',(select id::text from nt_users where k='other'),true);
insert into nt_results select 'unrelated Ghost cannot read the inbox or preferences',
 (select count(*)=0 from public.ghost_notifications) and (select count(*)=0 from public.ghost_notification_preferences);
insert into nt_results values ('members cannot forge notices or edit content',
 not has_table_privilege('authenticated','public.ghost_notifications','INSERT')
 and not has_column_privilege('authenticated','public.ghost_notifications','title','UPDATE'));
set local role anon;
insert into nt_results values ('anonymous cannot read inbox or preferences',
 not has_table_privilege('anon','public.ghost_notifications','SELECT')
 and not has_table_privilege('anon','public.ghost_notification_preferences','SELECT'));
reset role;
do $qa$
declare failures text;
begin
 select string_agg(label,', ') into failures from nt_results where not passed;
 if failures is not null then raise exception 'Notifications checks failed: %',failures; end if;
end $qa$;
select label,passed from nt_results order by label;
rollback;
