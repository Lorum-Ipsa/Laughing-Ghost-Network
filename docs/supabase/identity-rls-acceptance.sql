-- LGN Supabase identity/RLS acceptance suite (DEVELOPMENT only).
-- Tested 2026-11-07 on lgn-development.
-- Requires SQL editor / privileged database role able to SET LOCAL ROLE.
-- Synthetic auth.users entries never send mail and are all ROLLED BACK.
-- Do NOT run on production without review. Never add real member data here.
begin;
create temp table lgn_qa_actors(kind text primary key,id uuid not null) on commit drop;
create temp table lgn_qa_results(label text primary key,passed boolean not null) on commit drop;
grant select on lgn_qa_actors to authenticated;
grant select,insert on lgn_qa_results to authenticated,anon;
insert into lgn_qa_actors(kind,id) values
 ('owner',gen_random_uuid()),('other',gen_random_uuid()),
 ('unverified',gen_random_uuid()),('replacement',gen_random_uuid());
-- A malicious role in user-writable metadata MUST NOT authorize privileges.
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
select id,'authenticated','authenticated','lgn-qa-'||kind||'@example.invalid',
case when kind='unverified' then null else now() end,
case when kind='replacement' then '{"role":"admin","app_metadata":{"role":"admin"}}'::jsonb
else '{}'::jsonb end,now(),now() from lgn_qa_actors;
insert into lgn_qa_results(label,passed)
values
('auth trigger provisions four default ghost members',
 (select count(*)=4 and bool_and(role='ghost' and not suspended)
  from lgn_private.member_access where user_id in (select id from lgn_qa_actors))),
('auth trigger provisions four private preference rows',
 (select count(*)=4 from public.ghost_profile_preferences
  where user_id in (select id from lgn_qa_actors))),
('user metadata cannot self-assign admin role',
 (select role='ghost' from lgn_private.member_access
  where user_id=(select id from lgn_qa_actors where kind='replacement')));
-- Verified Ghost A claims a handle. A protected self-lookup link is auto-created.
set local role authenticated;
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='owner'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'lgnqa_auth_a_2026' from lgn_qa_actors where kind='owner';
insert into lgn_qa_results(label,passed)
select 'owner profile creates matching private self-lookup link',count(profile_id)=1
from public.ghost_profile_links
where profile_id=(select id from public.ghost_profiles where handle='lgnqa_auth_a_2026');
-- Verified Ghost B cannot see A's private records or edit A's profile.
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='other'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'lgnqa_auth_b_2026' from lgn_qa_actors where kind='other';
insert into lgn_qa_results(label,passed)
select 'second confirmed member can claim their own profile',count(profile_id)=1
from public.ghost_profile_links
where profile_id=(select id from public.ghost_profiles where handle='lgnqa_auth_b_2026');
insert into lgn_qa_results(label,passed) values
('other member sees only their own preference record',
 (select count(user_id)=1 from public.ghost_profile_preferences
  where user_id in (select id from lgn_qa_actors))),
('other member sees only their own self-lookup link',
 (select count(profile_id)=1 from public.ghost_profile_links
  where profile_id in (select id from public.ghost_profiles
    where handle in ('lgnqa_auth_a_2026','lgnqa_auth_b_2026'))));
with modified as (
 update public.ghost_profiles set bio='unauthorized change'
 where handle='lgnqa_auth_a_2026' returning id
)
insert into lgn_qa_results(label,passed)
select 'Ghost B cannot edit Ghost A profile',count(id)=0 from modified;
with modified as (
 update public.ghost_profile_preferences set allow_recruiter_contact=true
 where user_id=(select id from lgn_qa_actors where kind='owner') returning user_id
)
insert into lgn_qa_results(label,passed)
select 'Ghost B cannot edit Ghost A preferences',count(user_id)=0 from modified;
-- Owner writes must actually affect a row.
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='owner'),true);
with modified as (
 update public.ghost_profiles set bio='owner update'
 where handle='lgnqa_auth_a_2026' returning id
)
insert into lgn_qa_results(label,passed)
select 'owner can edit their own profile',count(id)=1 from modified;
with modified as (
 update public.ghost_profile_preferences set allow_recruiter_contact=true
 where user_id=(select id from lgn_qa_actors where kind='owner') returning user_id
)
insert into lgn_qa_results(label,passed)
select 'owner can edit their own preferences',count(user_id)=1 from modified;
-- SQL column grants protect pseudonymity even beyond row policies.
insert into lgn_qa_results(label,passed) values
('browser cannot read public profile owner ID',
 not has_column_privilege('authenticated','public.ghost_profiles','owner_id','SELECT')),
('browser cannot update public profile owner or handle',
 not has_column_privilege('authenticated','public.ghost_profiles','owner_id','UPDATE')
 and not has_column_privilege('authenticated','public.ghost_profiles','handle','UPDATE')),
('browser cannot read internal membership roles',
 not has_table_privilege('authenticated','lgn_private.member_access','SELECT')),
('browser cannot directly update internal membership roles',
 not has_table_privilege('authenticated','lgn_private.member_access','UPDATE'));
-- Unverified account: check helper and actual RLS-protected INSERT.
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='unverified'),true);
insert into lgn_qa_results(label,passed)
select 'unverified account is not an active member',not lgn_private.is_active_member();
do $test$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'lgnqa_unverified_2026' from lgn_qa_actors where kind='unverified';
 insert into lgn_qa_results(label,passed)
 values('unverified account cannot insert ghost profile',false);
exception when insufficient_privilege then
 insert into lgn_qa_results(label,passed)
 values('unverified account cannot insert ghost profile',true);
end $test$;
-- Anonymous visitors see the approved profile columns but cannot create data.
set local role anon;
insert into lgn_qa_results(label,passed)
select 'anonymous visitors can see public profile handles',count(id)=2
from public.ghost_profiles
where handle in ('lgnqa_auth_a_2026','lgnqa_auth_b_2026');
insert into lgn_qa_results(label,passed)
values('anonymous browser cannot create a profile',
 not has_column_privilege('anon','public.ghost_profiles','handle','INSERT'));
-- Suspension must take effect in PostgreSQL without needing JWT refresh.
reset role;
update lgn_private.member_access set suspended=true
where user_id=(select id from lgn_qa_actors where kind='owner');
set local role authenticated;
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='owner'),true);
insert into lgn_qa_results(label,passed)
select 'suspended member is no longer active',not lgn_private.is_active_member();
with modified as (
 update public.ghost_profiles set bio='should be blocked'
 where handle='lgnqa_auth_a_2026' returning id
)
insert into lgn_qa_results(label,passed)
select 'suspended member cannot edit their own profile',count(id)=0 from modified;
with modified as (
 update public.ghost_profile_preferences set allow_recruiter_contact=false
 where user_id=(select id from lgn_qa_actors where kind='owner') returning user_id
)
insert into lgn_qa_results(label,passed)
select 'suspended member cannot edit their own preferences',count(user_id)=0 from modified;
-- Persistent handle ledger must survive server-side profile removal.
reset role;
delete from public.ghost_profiles where handle='lgnqa_auth_a_2026';
set local role authenticated;
select set_config('request.jwt.claim.sub',
 (select id::text from lgn_qa_actors where kind='replacement'),true);
do $test$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'lgnqa_auth_a_2026' from lgn_qa_actors where kind='replacement';
 insert into lgn_qa_results(label,passed)
 values('deleted handle remains permanently reserved',false);
exception when unique_violation then
 insert into lgn_qa_results(label,passed)
 values('deleted handle remains permanently reserved',true);
end $test$;
reset role;
-- Failing assertions raise a database error rather than silently passing.
do $test$
declare failures text;
begin
 select string_agg(label,'; ' order by label) into failures
 from lgn_qa_results where not passed;
 if failures is not null then
   raise exception 'LGN identity RLS checks failed: %',failures;
 end if;
end $test$;
select label,passed from lgn_qa_results order by label;
rollback;
