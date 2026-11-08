-- Applied to lgn-development and exported from migration history.
-- Do not execute again against an initialized database.

-- LGN: author submission must contain a title and at least one meaningful content field.
-- No arbitrary minimum prose length. Brief code, source-only reports and short
-- observations are all acceptable; moderators review quality separately.
create or replace function lgn_private.check_member_contribution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  if tg_op='INSERT' then
    if new.status not in ('draft','submitted') then
      raise exception 'Only draft or submitted contributions may be created' using errcode='23514';
    end if;
    new.version:=1;
  else
    if old.status='published' or old.deleted_at is not null then
      raise exception 'Published/deleted work is locked for member edits' using errcode='23514';
    end if;
    if (old.status='draft' and new.status not in ('draft','submitted','archived'))
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
      raise exception 'Provide a title before submitting for review' using errcode='23514';
    end if;
    if char_length(trim(new.summary))=0
       and char_length(trim(new.body))=0
       and char_length(trim(new.code))=0
       and char_length(trim(new.source_url))=0 then
      raise exception 'Add a summary, body, code, or source link before submitting for review' using errcode='23514';
    end if;
    if new.submitted_at is null then new.submitted_at:=now(); end if;
  end if;
  new.updated_at:=now();
  return new;
end $fn$;
revoke all on function lgn_private.check_member_contribution() from public,anon,authenticated;
