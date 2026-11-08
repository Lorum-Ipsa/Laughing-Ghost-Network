-- Pending development migration. Apply after review-version-guard.sql.
-- Existing queued contributions and their findings are retained.
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
    if old.status='published' or old.deleted_at is not null then
      raise exception 'Published/deleted work is locked for edits' using errcode='23514';
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
      new.published_at:=now();
    end if;
  end if;
  new.updated_at:=now();
  return new;
end $function$;

-- The trigger above rejects a direct author request to set 'published'.
-- RLS must accept the server-transformed row for authorized owner updates.
alter policy "confirmed member changes editable own contribution"
on public.ghost_contributions
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
