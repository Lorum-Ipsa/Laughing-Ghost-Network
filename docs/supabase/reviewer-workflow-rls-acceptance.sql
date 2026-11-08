-- Development-only moderated publication QA. All test users, roles, work
-- and review decisions are rolled back without altering real members.
begin;
create temp table qa_users(kind text primary key,id uuid not null) on commit drop;
create temp table qa_results(label text primary key,passed boolean not null) on commit drop;
grant select on qa_users to authenticated,anon;
grant select,insert on qa_results to authenticated,anon;
insert into qa_users values ('author',gen_random_uuid()),('reviewer',gen_random_uuid()),('outsider',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','lgn-review-qa-'||kind||'@example.invalid',
now(),now(),now() from qa_users;
update lgn_private.member_access set role='reviewer'
where user_id=(select id from qa_users where kind='reviewer');
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='author'),true);end $x$;
insert into public.ghost_profiles(owner_id,handle)
select id,'QaAuthor!2026' from qa_users where kind='author';
insert into public.ghost_contributions(owner_id,profile_id,title,body,status)
select id,(select id from public.ghost_profiles where handle='QaAuthor!2026'),
'A QA research note','Brief note','submitted' from qa_users where kind='author';
insert into qa_results values('ordinary author cannot review',not public.can_review_contributions());
set local role anon;
insert into qa_results(label,passed)
select 'anonymous cannot see submitted work',count(id)=0 from public.ghost_contributions where title='A QA research note';
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='outsider'),true);end $x$;
insert into qa_results values('outsider cannot review',not public.can_review_contributions());
insert into qa_results(label,passed)
select 'outsider cannot read private submissions',count(id)=0 from public.ghost_contributions where title='A QA research note';
do $x$
begin
 perform public.review_ghost_contribution((select id from public.ghost_contributions where title='A QA research note'),1,'published','');
 insert into qa_results values('outsider cannot publish',false);
exception when insufficient_privilege then insert into qa_results values('outsider cannot publish',true);
end $x$;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='reviewer'),true);end $x$;
insert into qa_results values('authorized reviewer can review',public.can_review_contributions());
insert into qa_results(label,passed)
select 'reviewer sees submitted queue',count(id)=1 from public.ghost_contributions where title='A QA research note';
do $x$
begin
 perform public.review_ghost_contribution((select id from public.ghost_contributions where title='A QA research note'),1,'revision_requested','');
 insert into qa_results values('revision request requires feedback',false);
exception when invalid_parameter_value then insert into qa_results values('revision request requires feedback',true);
end $x$;
do $x$
begin perform public.review_ghost_contribution((select id from public.ghost_contributions where title='A QA research note'),1,'revision_requested','Cite the source');end $x$;
reset role;
insert into qa_results(label,passed)
select 'review status and version advanced',count(id)=1
from public.ghost_contributions where title='A QA research note' and status='revision_requested' and version=2;
insert into qa_results(label,passed)
select 'review decision logged',count(id)=1 from public.ghost_contribution_reviews where note='Cite the source';
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='author'),true);end $x$;
insert into qa_results(label,passed)
select 'author can read reviewer feedback',count(id)=1 from public.ghost_contribution_reviews;
update public.ghost_contributions set status='submitted' where title='A QA research note';
insert into qa_results(label,passed)
select 'author can resubmit',count(id)=1 from public.ghost_contributions where title='A QA research note' and status='submitted' and version=3;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='reviewer'),true);end $x$;
do $x$
begin
 perform public.review_ghost_contribution((select id from public.ghost_contributions where title='A QA research note'),1,'published','');
 insert into qa_results values('stale version blocked',false);
exception when serialization_failure then insert into qa_results values('stale version blocked',true);
end $x$;
do $x$
begin perform public.review_ghost_contribution((select id from public.ghost_contributions where title='A QA research note'),3,'published','Approved');end $x$;
reset role;
insert into qa_results(label,passed)
select 'published status and timestamp set',count(id)=1
from public.ghost_contributions where title='A QA research note' and status='published' and published_at is not null;
set local role anon;
insert into qa_results(label,passed)
select 'anonymous now sees published work',count(id)=1
from public.ghost_contributions where title='A QA research note';
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='outsider'),true);end $x$;
insert into qa_results(label,passed)
select 'nonreviewer cannot read review notes',count(id)=0 from public.ghost_contribution_reviews;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='reviewer'),true);end $x$;
insert into public.ghost_profiles(owner_id,handle)
select id,'QaReviewer+2026' from qa_users where kind='reviewer';
insert into public.ghost_contributions(owner_id,profile_id,title,body,status)
select id,(select id from public.ghost_profiles where handle='QaReviewer+2026'),
'Reviewer self note','Content','submitted' from qa_users where kind='reviewer';
do $x$
begin
 perform public.review_ghost_contribution((select id from public.ghost_contributions where title='Reviewer self note'),1,'published','');
 insert into qa_results values('reviewer cannot publish their own work',false);
exception when insufficient_privilege then insert into qa_results values('reviewer cannot publish their own work',true);
end $x$;
reset role;
update lgn_private.member_access set suspended=true
where user_id=(select id from qa_users where kind='reviewer');
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where kind='reviewer'),true);end $x$;
insert into qa_results values('suspended reviewer loses review access',not public.can_review_contributions());
reset role;
do $x$
declare failures text;
begin
 select string_agg(label,'; ') into failures from qa_results where not passed;
 if failures is not null then raise exception 'LGN review suite failed: %',failures;end if;
end $x$;
select label,passed from qa_results order by label;
rollback;