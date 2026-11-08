-- LGN development acceptance tests for Supabase contribution drafts/review boundaries.
-- All synthetic users and work are isolated in one ROLLBACK transaction.
-- Requires privileged SQL editor to switch into authenticated / anon roles.
begin;
create temp table qa_ghosts(kind text primary key,id uuid not null) on commit drop;
create temp table qa_results(test text primary key,passed boolean not null) on commit drop;
grant select on qa_ghosts to authenticated,anon;
grant select,insert on qa_results to authenticated,anon;
insert into qa_ghosts values('author',gen_random_uuid()),('other',gen_random_uuid()),('unverified',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','lgn-qa-contribution-'||kind||'@example.invalid',
case when kind='unverified' then null else now() end,now(),now() from qa_ghosts;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_ghosts where kind='author'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'lgnqa_contrib_author' from qa_ghosts where kind='author';
insert into public.ghost_contributions(owner_id,profile_id,kind,title,language,status)
select id,(select id from public.ghost_profiles where handle='lgnqa_contrib_author'),
'research','A research contribution draft','en','draft' from qa_ghosts where kind='author';
insert into qa_results(test,passed)
select 'author creates draft with revision one',
(select count(id)=1 from public.ghost_contributions where title='A research contribution draft')
and (select count(id)=1 from public.ghost_contribution_revisions);
do $qa$
begin
 update public.ghost_contributions set status='submitted' where title='A research contribution draft';
 insert into qa_results values('incomplete draft cannot be submitted',false);
exception when check_violation or insufficient_privilege then
 insert into qa_results values('incomplete draft cannot be submitted',true);
end $qa$;
update public.ghost_contributions
set summary='-----BEGIN PRIVATE KEY----- synthetic fixture',
 body=repeat('Reproducible analysis and limitations. ',4),
 status='submitted' where title='A research contribution draft';
insert into qa_results(test,passed)
select 'valid submission advances version and stores snapshot',
(select count(id)=1 from public.ghost_contributions
 where status='submitted' and version=2 and submitted_at is not null)
and (select count(id)=2 from public.ghost_contribution_revisions);
do $qa$
begin
 update public.ghost_contributions set status='published' where title='A research contribution draft';
 insert into qa_results values('author cannot directly publish held work',false);
exception when check_violation or insufficient_privilege then
 insert into qa_results values('author cannot directly publish held work',true);
end $qa$;
select set_config('request.jwt.claim.sub',(select id::text from qa_ghosts where kind='other'),true);
insert into public.ghost_profiles(owner_id,handle)
select id,'lgnqa_contrib_other' from qa_ghosts where kind='other';
insert into qa_results(test,passed)
select 'second Ghost cannot read first Ghost unpublished work',count(id)=0
from public.ghost_contributions where title='A research contribution draft';
with a as (update public.ghost_contributions set title='Unauthorized'
where title='A research contribution draft' returning id)
insert into qa_results(test,passed)
select 'second Ghost cannot edit first Ghost work',count(id)=0 from a;
insert into qa_results(test,passed)
select 'second Ghost cannot read first Ghost revision history',count(id)=0
from public.ghost_contribution_revisions;
do $qa$
begin
 insert into public.ghost_contributions(owner_id,profile_id,title)
 select (select id from qa_ghosts where kind='other'),
 (select id from public.ghost_profiles where handle='lgnqa_contrib_author'),'Spoofed attribution';
 insert into qa_results values('other Ghost cannot impersonate profile',false);
exception when check_violation or insufficient_privilege then
 insert into qa_results values('other Ghost cannot impersonate profile',true);
end $qa$;
set local role anon;
insert into qa_results(test,passed)
select 'anonymous visitor cannot read unpublished work',count(id)=0
from public.ghost_contributions;
insert into qa_results(test,passed)
values('anonymous visitor cannot write contributions',
not has_table_privilege('anon','public.ghost_contributions','INSERT'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_ghosts where kind='unverified'),true);
do $qa$
begin
 insert into public.ghost_contributions(owner_id,profile_id,title)
 select (select id from qa_ghosts where kind='unverified'),
 (select id from public.ghost_profiles where handle='lgnqa_contrib_other'),'Unverified attempt';
 insert into qa_results values('unverified account cannot create contribution',false);
exception when check_violation or insufficient_privilege then
 insert into qa_results values('unverified account cannot create contribution',true);
end $qa$;
reset role;
update lgn_private.member_access set suspended=true
where user_id=(select id from qa_ghosts where kind='author');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from qa_ghosts where kind='author'),true);
with a as (update public.ghost_contributions set status='draft'
where title='A research contribution draft' returning id)
insert into qa_results(test,passed)
select 'suspension blocks contribution changes immediately',count(id)=0 from a;
insert into qa_results(test,passed)
values('author cannot edit owner, published timestamp or review state',
not has_column_privilege('authenticated','public.ghost_contributions','owner_id','UPDATE')
and not has_column_privilege('authenticated','public.ghost_contributions','published_at','UPDATE'));
insert into qa_results(test,passed)
values('author cannot rewrite immutable revisions',
not has_table_privilege('authenticated','public.ghost_contribution_revisions','UPDATE'));
reset role;
do $qa$
declare failures text;
begin
 select string_agg(test,'; ' order by test) into failures from qa_results where not passed;
 if failures is not null then raise exception 'LGN contributions QA failed: %',failures; end if;
end $qa$;
select test,passed from qa_results order by test;
rollback;
