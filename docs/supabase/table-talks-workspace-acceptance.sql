-- Synthetic development fixtures. This script always rolls back.
begin;
create temp table tt_users(k text primary key,id uuid) on commit drop;
create temp table tt_results(label text primary key,passed boolean not null) on commit drop;
grant select on tt_users to authenticated;
grant insert,select on tt_results to authenticated,anon;
insert into tt_users values ('host',gen_random_uuid()),('member',gen_random_uuid()),('other',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','tt-qa-'||k||'@example.invalid',now(),now(),now() from tt_users;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='host'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'TableQAHost' from tt_users where k='host';
insert into public.ghost_table_talks(profile_id,title) select id,'QA exercise' from public.ghost_profiles where handle='TableQAHost';
insert into public.ghost_table_talk_materials(talk_id,scenario) select id,'Private synthetic scenario' from public.ghost_table_talks where title='QA exercise';
insert into public.ghost_table_talk_debriefs(talk_id,body) select id,'Private synthetic recap' from public.ghost_table_talks where title='QA exercise';
set local role anon;
insert into tt_results select 'visitor cannot see a draft',count(*)=0 from public.ghost_table_talks where title='QA exercise';
insert into tt_results values ('visitors cannot read scenario, roster, decisions or debrief',
  not has_table_privilege('anon','public.ghost_table_talk_materials','SELECT')
  and not has_table_privilege('anon','public.ghost_table_talk_members','SELECT')
  and not has_table_privilege('anon','public.ghost_table_talk_decisions','SELECT')
  and not has_table_privilege('anon','public.ghost_table_talk_debriefs','SELECT'));
set local role authenticated;
update public.ghost_table_talks set status='open' where title='QA exercise';
set local role anon;
insert into tt_results select 'visitor sees open brief',count(*)=1 from public.ghost_table_talks where title='QA exercise';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='member'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'TableQAMember' from tt_users where k='member';
insert into public.ghost_table_talk_members(talk_id,profile_id)
select t.id,g.id from public.ghost_table_talks t cross join public.ghost_profiles g where t.title='QA exercise' and g.handle='TableQAMember';
insert into tt_results select 'registered member cannot read materials before start',count(*)=0 from public.ghost_table_talk_materials where scenario='Private synthetic scenario';
with changed as (update public.ghost_table_talk_members set role='Lead' returning profile_id)
insert into tt_results select 'member cannot assign their own role',count(*)=0 from changed;
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='host'),true);
update public.ghost_table_talk_members set role='Responder' where talk_id=(select id from public.ghost_table_talks where title='QA exercise');
update public.ghost_table_talks set status='in_progress' where title='QA exercise';
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='other'),true);
insert into tt_results select 'nonparticipant cannot read scenario or roster',
  (select count(*)=0 from public.ghost_table_talk_materials where scenario='Private synthetic scenario')
  and (select count(*)=0 from public.ghost_table_talk_members);
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='member'),true);
insert into tt_results select 'participant sees live scenario and assigned role',
  (select count(*)=1 from public.ghost_table_talk_materials where scenario='Private synthetic scenario')
  and (select count(*)=1 from public.ghost_table_talk_members where role='Responder');
insert into tt_results select 'participant cannot read debrief before completion',count(*)=0 from public.ghost_table_talk_debriefs where body='Private synthetic recap';
insert into public.ghost_table_talk_decisions(talk_id,profile_id,point,decision)
select t.id,g.id,'QA decision point','Synthetic response'
from public.ghost_table_talks t cross join public.ghost_profiles g where t.title='QA exercise' and g.handle='TableQAMember';
insert into tt_results select 'participant sees their own decision',count(*)=1 from public.ghost_table_talk_decisions where point='QA decision point';
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='other'),true);
insert into tt_results select 'nonparticipant cannot read decisions',count(*)=0 from public.ghost_table_talk_decisions where point='QA decision point';
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='host'),true);
insert into tt_results select 'facilitator reads participant decisions',count(*)=1 from public.ghost_table_talk_decisions where point='QA decision point';
update public.ghost_table_talks set status='completed' where title='QA exercise';
select set_config('request.jwt.claim.sub',(select id::text from tt_users where k='member'),true);
insert into tt_results select 'participant reads completed debrief',count(*)=1 from public.ghost_table_talk_debriefs where body='Private synthetic recap';
with changed as (update public.ghost_table_talk_decisions set decision='Late edit' where point='QA decision point' returning id)
insert into tt_results select 'completed decisions cannot be revised',count(*)=0 from changed;
reset role;
do $qa$
declare failures text;
begin
 select string_agg(label,', ') into failures from tt_results where not passed;
 if failures is not null then raise exception 'Table Talks checks failed: %',failures; end if;
end $qa$;
select label,passed from tt_results order by label;
rollback;
