-- Synthetic account fixtures. All changes roll back.
begin;
create temp table settings_users(k text primary key,id uuid) on commit drop;
create temp table settings_checks(label text primary key,passed boolean not null) on commit drop;
grant select on settings_users to authenticated;
grant select,insert on settings_checks to authenticated,anon;
insert into settings_users values ('a',gen_random_uuid()),('b',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select id,'authenticated','authenticated','settings-qa-'||k||'@example.invalid',now(),now(),now() from settings_users;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from settings_users where k='a'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'SettingsQAAlpha' from settings_users where k='a';
insert into public.ghost_contributions(owner_id,profile_id,title,summary,status)
select u.id,g.id,'QA settings public work','Synthetic publication','submitted'
from settings_users u cross join public.ghost_profiles g where u.k='a' and g.handle='SettingsQAAlpha';
select set_config('request.jwt.claim.sub',(select id::text from settings_users where k='b'),true);
insert into public.ghost_profiles(owner_id,handle) select id,'SettingsQABeta' from settings_users where k='b';
insert into settings_checks
select 'export is scoped to current user and omits the other account',
  data->'account'->>'email'='settings-qa-b@example.invalid'
  and data->'profile'->>'handle'='SettingsQABeta'
  and jsonb_array_length(data->'contributions')=0
  and not (data ?| array['auth_tokens','push_subscriptions','dm_private_keys'])
from (select public.export_ghost_account() data) q;
do $qa$
begin
 perform public.deactivate_ghost_account('SettingsQAAlpha');
 raise sqlstate 'LGN01';
exception
 when invalid_parameter_value then insert into settings_checks values ('cannot deactivate another Ghost',true);
 when sqlstate 'LGN01' then insert into settings_checks values ('cannot deactivate another Ghost',false);
end $qa$;
reset role;
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
select gen_random_uuid(),id,'totp','verified',now(),now() from settings_users where k='a';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from settings_users where k='a'),true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
insert into settings_checks values ('verified factor requires AAL2',public.ghost_account_state()='mfa_required');
insert into settings_checks select 'AAL1 cannot read private preferences',count(*)=0 from public.ghost_profile_preferences;
do $qa$
begin
 perform public.export_ghost_account();
 raise sqlstate 'LGN01';
exception
 when insufficient_privilege then insert into settings_checks values ('AAL1 cannot use account export RPC',true);
 when sqlstate 'LGN01' then insert into settings_checks values ('AAL1 cannot use account export RPC',false);
end $qa$;
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
insert into settings_checks values ('AAL2 unlocks account',public.ghost_account_state()='active');
insert into settings_checks
select 'verified export includes owned work',jsonb_array_length(data->'contributions')=1
from (select public.export_ghost_account() data) q;
select public.deactivate_ghost_account('SettingsQAAlpha');
insert into settings_checks values ('deactivation immediately blocks the current token',public.ghost_account_state()='deactivated');
insert into settings_checks select 'deactivated token cannot read private preferences',count(*)=0 from public.ghost_profile_preferences;
do $qa$
begin
 perform public.export_ghost_account();
 raise sqlstate 'LGN01';
exception
 when insufficient_privilege then insert into settings_checks values ('deactivated token cannot export',true);
 when sqlstate 'LGN01' then insert into settings_checks values ('deactivated token cannot export',false);
end $qa$;
set local role anon;
insert into settings_checks values ('anonymous cannot call export or deactivate',
 not has_function_privilege('anon','public.export_ghost_account()','EXECUTE')
 and not has_function_privilege('anon','public.deactivate_ghost_account(text)','EXECUTE'));
insert into settings_checks select 'deactivation preserves public work',count(id)=1
from public.ghost_contributions where title='QA settings public work';
reset role;
do $qa$
declare failures text;
begin
 select string_agg(label,', ') into failures from settings_checks where not passed;
 if failures is not null then raise exception 'Settings checks failed: %',failures; end if;
end $qa$;
select label,passed from settings_checks order by label;
rollback;
