-- Re-run on approved LGN DEVELOPMENT database only.
-- Uses synthetic users, real RLS and UNIQUE constraints, and a full rollback.
begin;
create temp table qa_handles(label text primary key,passed boolean not null) on commit drop;
create temp table qa_ids(k text primary key,id uuid not null) on commit drop;
grant select on qa_ids to authenticated;
grant select,insert on qa_handles to authenticated;
insert into qa_ids values ('a',gen_random_uuid()),('b',gen_random_uuid()),('c',gen_random_uuid()),('d',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','handle-qa-'||k||'@example.invalid',now(),now(),now() from qa_ids;
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_ids where k='a'),true);end $x$;
insert into public.ghost_profiles(owner_id,handle)
select id,'Ghost!One' from qa_ids where k='a';
insert into qa_handles values('uppercase and punctuation preserved',
(select count(*)=1 from public.ghost_profiles where handle='Ghost!One'));
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_ids where k='b'),true);end $x$;
do $x$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'ghost!one' from qa_ids where k='b';
 insert into qa_handles values('case-insensitive collision prevented',false);
exception when unique_violation then
 insert into qa_handles values('case-insensitive collision prevented',true);
end $x$;
insert into public.ghost_profiles(owner_id,handle)
select id,'Night+Shift#42' from qa_ids where k='b';
insert into qa_handles values('additional symbols permitted',
(select count(*)=1 from public.ghost_profiles where handle='Night+Shift#42'));
reset role;
delete from public.ghost_profiles where handle='Ghost!One';
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_ids where k='c'),true);end $x$;
do $x$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'GHOST!ONE' from qa_ids where k='c';
 insert into qa_handles values('deleted handle remains reserved across casing',false);
exception when unique_violation then
 insert into qa_handles values('deleted handle remains reserved across casing',true);
end $x$;
do $x$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'Bad/New' from qa_ids where k='c';
 insert into qa_handles values('single slash not accepted for new handles',false);
exception when check_violation then
 insert into qa_handles values('single slash not accepted for new handles',true);
end $x$;
do $x$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'Bad///Ghost' from qa_ids where k='c';
 insert into qa_handles values('triple slash is rejected',false);
exception when check_violation then
 insert into qa_handles values('triple slash is rejected',true);
end $x$;
set local role authenticated;
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_ids where k='d'),true);end $x$;
insert into public.ghost_profiles(owner_id,handle)
select id,'Laughing//Ghost' from qa_ids where k='d';
insert into qa_handles values('LGN double slash accepted and preserved',
(select count(*)=1 from public.ghost_profiles where handle='Laughing//Ghost'));
do $x$ begin perform set_config('request.jwt.claim.sub',(select id::text from qa_ids where k='c'),true);end $x$;
do $x$
begin
 insert into public.ghost_profiles(owner_id,handle)
 select id,'laughing//ghost' from qa_ids where k='c';
 insert into qa_handles values('double slash casefold collision blocked',false);
exception when unique_violation then
 insert into qa_handles values('double slash casefold collision blocked',true);
end $x$;
reset role;
insert into qa_handles values('grandfathered slash handle unchanged',
(select count(*)=1 from public.ghost_profiles where handle='null//ghost'));
do $x$
declare fails text;
begin select string_agg(label,'; ') into fails from qa_handles where not passed;
if fails is not null then raise exception 'Handle tests failed: %',fails; end if;
end $x$;
select label,passed from qa_handles order by label;
rollback;