-- Pending development migration. Apply after review-version-guard.sql.
-- Existing queued contributions and their findings are retained.
create function lgn_private.can_moderate_reports()
returns boolean language sql stable security definer set search_path='' as $fn$
  select lgn_private.is_active_member() and exists (
    select 1 from lgn_private.member_access
    where user_id=(select auth.uid()) and role in ('moderator','admin')
  );
$fn$;
revoke all on function lgn_private.can_moderate_reports() from public,anon,authenticated;
grant execute on function lgn_private.can_moderate_reports() to authenticated;

create function public.can_moderate_reports()
returns boolean language sql stable security invoker set search_path='' as $fn$
  select lgn_private.can_moderate_reports();
$fn$;
revoke all on function public.can_moderate_reports() from public,anon,authenticated;
grant execute on function public.can_moderate_reports() to authenticated;

CREATE OR REPLACE FUNCTION lgn_private.check_member_contribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  reviewer_transition boolean := false;
  screening_text text;
begin
  if tg_op='INSERT' then
    if new.status not in ('draft','submitted') then
      raise exception 'Only draft or submitted contributions may be created' using errcode='23514';
    end if;
    new.version:=1;
  else
    -- Only the owner deletion and moderator report RPCs can write deleted_at.
    if new.deleted_at is distinct from old.deleted_at then
      if old.deleted_at is not null or new.deleted_at is null
        or not lgn_private.is_active_member()
        or (old.owner_id is distinct from (select auth.uid())
          and not lgn_private.can_moderate_reports())
      then
        raise exception 'Contribution deletion requires an active owner or moderator' using errcode='42501';
      end if;
      new.updated_at:=now();
      return new;
    end if;
    if old.deleted_at is not null then
      raise exception 'Deleted work is locked for edits' using errcode='23514';
    end if;
    if old.status='published' then
      if new.status<>'submitted' or old.owner_id is distinct from (select auth.uid()) then
        raise exception 'Only the owner can submit a revision of published work' using errcode='42501';
      end if;
      new.submitted_at:=now();
      new.published_at:=null;
    end if;
    reviewer_transition := (
      old.status='submitted'
      and new.status in ('revision_requested','rejected','published')
    );
    if reviewer_transition then
      if not lgn_private.can_review_contributions()
         or old.owner_id=(select auth.uid()) then
        raise exception 'Only a different authorized reviewer may decide a submission'
          using errcode='42501';
      end if;
    elsif (old.status='draft' and new.status not in ('draft','submitted','archived'))
       or (old.status='submitted' and new.status not in ('submitted','draft'))
       or (old.status in ('revision_requested','rejected') and new.status not in ('draft','submitted','archived'))
       or (old.status='archived' and new.status not in ('archived','draft')) then
      raise exception 'Invalid contribution status transition' using errcode='23514';
    end if;
    if (new.title,new.language,new.domain,new.summary,new.body,new.tags,new.source_url,new.code,new.status)
      is distinct from (old.title,old.language,old.domain,old.summary,old.body,old.tags,old.source_url,old.code,old.status) then
      new.version:=old.version+1;
    else
      new.version:=old.version;
    end if;
  end if;
  if new.status='submitted' then
    if char_length(trim(new.title))=0 then
      raise exception 'Provide a title before publishing' using errcode='23514';
    end if;
    if char_length(trim(new.summary))=0
      and char_length(trim(new.body))=0
      and char_length(trim(new.code))=0
      and char_length(trim(new.source_url))=0 then
      raise exception 'Add a summary, body, code, or source link before publishing'
        using errcode='23514';
    end if;
    if new.submitted_at is null then new.submitted_at:=now(); end if;
    -- The author requests submission. Only the server can turn that request
    -- into a published row. Credential-like material stays in the review queue.
    screening_text := concat_ws(E'\n',new.title,new.summary,new.body,new.code,new.tags,new.source_url,new.domain);
    if (tg_op='INSERT' or new.version<>old.version)
      and screening_text !~ 'AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk_live_[A-Za-z0-9]{8,}'
      and screening_text !~* '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
    then
      new.status:='published';
      if tg_op='UPDATE' and old.status='published' then
        new.published_at:=old.published_at;
      else
        new.published_at:=now();
      end if;
    end if;
  end if;
  new.updated_at:=now();
  return new;
end $function$;

-- The trigger above rejects a direct author request to set 'published'.
-- RLS must accept the server-transformed row for authorized owner updates.
alter policy "confirmed member changes editable own contribution"
on public.ghost_contributions
using (
  owner_id=(select auth.uid()) and deleted_at is null
  and (select lgn_private.is_active_member())
)
with check (
  owner_id=(select auth.uid()) and deleted_at is null
  and (select lgn_private.is_active_member())
);

-- Only versions that remain submitted after screening reach this evaluator.
-- Keep the existing private function and its grants for the after-write trigger.
create or replace function lgn_private.apply_ghost_triage(p_work public.ghost_contributions)
returns void language plpgsql security definer set search_path='' as $fn$
begin
  if p_work.status <> 'submitted' or p_work.deleted_at is not null then return; end if;
  insert into public.ghost_contribution_triage
    (contribution_id,version,policy_version,recommendation,signals,resolution)
  values (
    p_work.id,p_work.version,'LGN-TRIAGE-2','investigate',
    jsonb_build_array(jsonb_build_object(
      'rule','R301',
      'finding','Possible credential or private-key material',
      'required_action','Check for exposed secrets and request redaction if needed'
    )),
    'pending'
  )
  on conflict(contribution_id,version) do nothing;
end $fn$;

-- Keep the row and its revision and moderation records for audit. Existing
-- read policies hide the tombstone from public, owner and review queues.
create function public.delete_ghost_contribution(
  p_contribution_id uuid, p_expected_version integer
) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare
  target public.ghost_contributions%rowtype;
begin
  if (select auth.uid()) is null or not lgn_private.is_active_member() then
    raise exception 'An active member account is required' using errcode='42501';
  end if;

  select * into target from public.ghost_contributions
  where id=p_contribution_id and owner_id=(select auth.uid())
  for update;
  if not found then
    raise exception 'Contribution is unavailable' using errcode='42501';
  end if;
  if target.version is distinct from p_expected_version then
    raise exception 'Contribution changed; reload before deleting' using errcode='40001';
  end if;
  if target.deleted_at is not null then return true; end if;

  update public.ghost_contributions set deleted_at=now() where id=target.id;
  return true;
end $fn$;
revoke all on function public.delete_ghost_contribution(uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_ghost_contribution(uuid,integer) to authenticated;

create table public.ghost_contribution_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid(),
  contribution_id uuid references public.ghost_contributions(id) on delete restrict,
  contribution_version integer,
  subject text not null check (char_length(trim(subject)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 20 and 5000),
  created_at timestamptz not null default now(),
  outcome text check (outcome in ('dismissed','taken_down')),
  moderator_id uuid,
  decision_note text check (char_length(trim(decision_note)) between 1 and 4000),
  decided_at timestamptz
);
alter table public.ghost_contribution_reports enable row level security;
revoke all on public.ghost_contribution_reports from public,anon,authenticated;
grant insert(contribution_id,subject,body) on public.ghost_contribution_reports to authenticated;
grant select(id,contribution_id,contribution_version,subject,body,created_at,outcome,decision_note,decided_at)
  on public.ghost_contribution_reports to authenticated;
create index ghost_contribution_reports_work_idx on public.ghost_contribution_reports(contribution_id);
create index ghost_contribution_reports_open_idx
  on public.ghost_contribution_reports(created_at,id) where outcome is null;

create policy "active members submit private reports"
  on public.ghost_contribution_reports for insert to authenticated
  with check (reporter_id=(select auth.uid()) and (select lgn_private.is_active_member()));
create policy "moderators read private reports"
  on public.ghost_contribution_reports for select to authenticated
  using ((select lgn_private.can_moderate_reports()));

create function lgn_private.capture_reported_version()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  if new.contribution_id is not null then
    select version into new.contribution_version
    from public.ghost_contributions
    where id=new.contribution_id and status='published';
    if not found then
      raise exception 'The public contribution is no longer available' using errcode='22023';
    end if;
  end if;
  return new;
end $fn$;
revoke all on function lgn_private.capture_reported_version() from public,anon,authenticated;
create trigger capture_reported_version_before_insert
  before insert on public.ghost_contribution_reports
  for each row execute function lgn_private.capture_reported_version();

create function public.resolve_contribution_report(p_report_id uuid,p_outcome text,p_note text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare
  report public.ghost_contribution_reports%rowtype;
  work public.ghost_contributions%rowtype;
  note text:=trim(coalesce(p_note,''));
begin
  if (select auth.uid()) is null or not lgn_private.can_moderate_reports() then
    raise exception 'Moderator authorization required' using errcode='42501';
  end if;
  if p_outcome is null or p_outcome not in ('dismissed','taken_down')
    or char_length(note) not between 1 and 4000
  then
    raise exception 'A valid outcome and decision note are required' using errcode='22023';
  end if;
  select * into report from public.ghost_contribution_reports where id=p_report_id for update;
  if not found or report.outcome is not null then
    raise exception 'Report is no longer open' using errcode='22023';
  end if;
  if p_outcome='taken_down' then
    select * into work from public.ghost_contributions where id=report.contribution_id for update;
    if not found or work.status<>'published' or work.deleted_at is not null
      or work.version is distinct from report.contribution_version
    then
      raise exception 'The reported version is no longer public' using errcode='40001';
    end if;
    if work.owner_id=(select auth.uid()) then
      raise exception 'Another moderator must decide a report on your work' using errcode='42501';
    end if;
    update public.ghost_contributions set deleted_at=now() where id=work.id;
  end if;
  update public.ghost_contribution_reports
  set outcome=p_outcome,moderator_id=(select auth.uid()),decision_note=note,decided_at=now()
  where id=report.id;
  return true;
end $fn$;
revoke all on function public.resolve_contribution_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_contribution_report(uuid,text,text) to authenticated;
