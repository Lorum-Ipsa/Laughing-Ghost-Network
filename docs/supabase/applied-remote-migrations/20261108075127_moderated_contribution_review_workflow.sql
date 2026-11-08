-- Exported directly from the already-applied LGN development migration history.
-- DO NOT replay on the existing project. A clean CLI baseline is pending.

-- LGN moderated contribution workflow. Every review action checks the private,
-- server-managed role and forbids self-review. No public browser writes to
-- review logs or privileged status transitions are granted.
begin;
create function lgn_private.can_review_contributions()
returns boolean language sql stable security definer set search_path='' as $fn$
  select (select auth.uid()) is not null and exists (
    select 1 from lgn_private.member_access m
      join auth.users u on u.id=m.user_id
    where m.user_id=(select auth.uid())
      and m.role in ('reviewer','moderator','admin')
      and not m.suspended and u.email_confirmed_at is not null
      and u.deleted_at is null
  );
$fn$;
revoke all on function lgn_private.can_review_contributions() from public,anon,authenticated;
grant execute on function lgn_private.can_review_contributions() to authenticated;
create function public.can_review_contributions()
returns boolean language sql stable security invoker set search_path='' as $fn$
  select lgn_private.can_review_contributions();
$fn$;
revoke all on function public.can_review_contributions() from public,anon,authenticated;
grant execute on function public.can_review_contributions() to authenticated;

create policy "reviewers see the submitted queue"
on public.ghost_contributions for select to authenticated
using (status='submitted' and deleted_at is null
  and (select lgn_private.can_review_contributions()));

create table public.ghost_contribution_reviews (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.ghost_contributions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  version_reviewed integer not null check (version_reviewed>=1),
  action text not null check (action in ('revision_requested','rejected','published')),
  note text not null default '' check (char_length(note)<=4000),
  created_at timestamptz not null default now()
);
create index ghost_contribution_reviews_contribution_idx
 on public.ghost_contribution_reviews(contribution_id,created_at desc);
alter table public.ghost_contribution_reviews enable row level security;
revoke all on public.ghost_contribution_reviews from public,anon,authenticated;
grant select (id,contribution_id,version_reviewed,action,note,created_at)
 on public.ghost_contribution_reviews to authenticated;
create policy "authors and reviewers see review decisions"
on public.ghost_contribution_reviews for select to authenticated
using (
  (select lgn_private.can_review_contributions())
  or contribution_id in (
    select c.id from public.ghost_contributions c
    where c.profile_id in (
      select l.profile_id from public.ghost_profile_links l
    )
  )
);

-- Retain all author transition rules. Privileged review transitions are
-- permitted only for a different, verified, non-suspended reviewer.
create or replace function lgn_private.check_member_contribution()
returns trigger language plpgsql security invoker set search_path='' as $fn$
declare reviewer_transition boolean := false;
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
      raise exception 'Provide a title before submitting for review' using errcode='23514';
    end if;
    if char_length(trim(new.summary))=0
      and char_length(trim(new.body))=0
      and char_length(trim(new.code))=0
      and char_length(trim(new.source_url))=0 then
      raise exception 'Add a summary, body, code, or source link before submitting for review'
        using errcode='23514';
    end if;
    if new.submitted_at is null then new.submitted_at:=now(); end if;
  end if;
  new.updated_at:=now();
  return new;
end $fn$;
revoke all on function lgn_private.check_member_contribution() from public,anon,authenticated;

create function public.review_ghost_contribution(
  p_contribution_id uuid,
  p_expected_version integer,
  p_action text,
  p_note text default ''
) returns text
language plpgsql security definer set search_path='' as $fn$
declare target public.ghost_contributions%rowtype;
declare note_clean text:=trim(coalesce(p_note,''));
begin
  if (select auth.uid()) is null
     or not lgn_private.can_review_contributions() then
    raise exception 'Reviewer authorization required' using errcode='42501';
  end if;
  if p_action not in ('revision_requested','rejected','published') or p_action is null then
    raise exception 'Invalid review decision' using errcode='22023';
  end if;
  if char_length(note_clean)>4000 then
    raise exception 'Reviewer note is too long' using errcode='22023';
  end if;
  if p_action in ('revision_requested','rejected') and note_clean='' then
    raise exception 'Provide feedback when requesting changes or rejecting work' using errcode='22023';
  end if;
  select * into target from public.ghost_contributions
   where id=p_contribution_id for update;
  if not found or target.deleted_at is not null or target.status<>'submitted' then
    raise exception 'Submission no longer available for review' using errcode='22023';
  end if;
  if target.version<>p_expected_version then
    raise exception 'Submission changed; reload before reviewing' using errcode='40001';
  end if;
  if target.owner_id=(select auth.uid()) then
    raise exception 'You cannot review your own submission' using errcode='42501';
  end if;
  update public.ghost_contributions
    set status=p_action,
        published_at=case when p_action='published' then now() else null end
    where id=target.id;
  insert into public.ghost_contribution_reviews(
    contribution_id,reviewer_id,version_reviewed,action,note
  ) values (target.id,(select auth.uid()),target.version,p_action,note_clean);
  return p_action;
end $fn$;
revoke all on function public.review_ghost_contribution(uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.review_ghost_contribution(uuid,integer,text,text)
 to authenticated;
commit;
