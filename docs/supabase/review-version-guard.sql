-- Pending migration for the existing LGN development schema.
-- Rollback: restore only review_ghost_contribution from the v1 triage migration.
create or replace function public.review_ghost_contribution(
  p_contribution_id uuid, p_expected_version integer,
  p_action text, p_note text default ''
) returns text language plpgsql security definer set search_path='' as $fn$
declare
  target public.ghost_contributions%rowtype;
  triage public.ghost_contribution_triage%rowtype;
  note_clean text:=trim(coalesce(p_note,''));
begin
  if (select auth.uid()) is null or not lgn_private.can_review_contributions() then
    raise exception 'Reviewer authorization required' using errcode='42501';
  end if;
  if p_action is null or p_action not in
    ('revision_requested','rejected','published','triage_cleared') then
    raise exception 'Invalid review action' using errcode='22023';
  end if;
  if char_length(note_clean)>4000 then
    raise exception 'Reviewer note is too long' using errcode='22023';
  end if;
  if p_action in ('revision_requested','rejected','triage_cleared')
    and note_clean='' then
    raise exception 'A reason is required for revisions, rejection and investigation clearance'
      using errcode='22023';
  end if;

  select * into target from public.ghost_contributions
    where id=p_contribution_id for update;
  if not found or target.deleted_at is not null or target.status<>'submitted' then
    raise exception 'Submission is no longer available for review'
      using errcode='22023';
  end if;
  if target.version is distinct from p_expected_version then
    raise exception 'Submission changed; reload before reviewing' using errcode='40001';
  end if;
  if target.owner_id=(select auth.uid()) then
    raise exception 'Reviewers cannot decide their own submissions' using errcode='42501';
  end if;

  select * into triage from public.ghost_contribution_triage
    where contribution_id=target.id and version=target.version for update;

  if p_action='triage_cleared' then
    if not found or triage.recommendation='human_review'
      or triage.resolution<>'pending' then
      raise exception 'No unresolved investigation for this contribution version'
        using errcode='22023';
    end if;
    update public.ghost_contribution_triage
      set resolution='cleared',resolution_note=note_clean,
          resolved_by=(select auth.uid()),resolved_at=now()
      where contribution_id=target.id and version=target.version;
  else
    if p_action='published' and (
      not found or (triage.recommendation<>'human_review'
        and triage.resolution<>'cleared')
    ) then
      raise exception 'Resolve bot investigation/rejection recommendation before publication'
        using errcode='42501';
    end if;
    update public.ghost_contributions
      set status=p_action,
          published_at=case when p_action='published' then now() else null end
      where id=target.id;
  end if;

  insert into public.ghost_contribution_reviews
    (contribution_id,reviewer_id,version_reviewed,action,note)
  values (target.id,(select auth.uid()),target.version,p_action,note_clean);
  return p_action;
end $fn$;
