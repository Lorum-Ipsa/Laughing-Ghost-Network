-- Directly exported from already-applied LGN development Supabase migration history.
-- DO NOT replay on the initialized project. A clean CLI baseline remains pending.

-- LGN deterministic rules-bot v1.  Triage runs synchronously each time
-- a submission enters review. It NEVER publishes or rejects work by itself.
-- Human publication/rejection stays on the existing role/owner/version RPC.
begin;
create table public.ghost_contribution_triage (
  contribution_id uuid not null references public.ghost_contributions(id) on delete cascade,
  version integer not null check (version >= 1),
  policy_version text not null default 'LGN-TRIAGE-1',
  recommendation text not null check (recommendation in ('human_review','investigate','reject_candidate')),
  signals jsonb not null default '[]'::jsonb check (jsonb_typeof(signals)='array'),
  resolution text not null default 'not_required'
    check (resolution in ('not_required','pending','cleared')),
  resolution_note text not null default '' check (char_length(resolution_note)<=4000),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(contribution_id,version),
  constraint triage_resolution_requires_recommendation check (
    (recommendation='human_review' and resolution='not_required')
    or (recommendation<>'human_review' and resolution in ('pending','cleared'))
  )
);
create index ghost_contribution_triage_resolution_idx
  on public.ghost_contribution_triage(recommendation,resolution,created_at desc);
create index ghost_contribution_triage_resolved_by_idx
  on public.ghost_contribution_triage(resolved_by);
alter table public.ghost_contribution_triage enable row level security;
revoke all on public.ghost_contribution_triage from public,anon,authenticated;
grant select (contribution_id,version,policy_version,recommendation,signals,resolution,
  resolution_note,resolved_at,created_at)
  on public.ghost_contribution_triage to authenticated;
create policy "reviewers and contribution owners read bot triage"
  on public.ghost_contribution_triage for select to authenticated
  using (
    (select lgn_private.can_review_contributions())
    or contribution_id in (
      select c.id from public.ghost_contributions c
      where c.profile_id in (select l.profile_id from public.ghost_profile_links l)
    )
  );

-- Private evaluator: deterministic decisions, documented rule IDs,
-- no external model and no forwarding of member submissions to vendors.
create function lgn_private.apply_ghost_triage(p_work public.ghost_contributions)
returns void language plpgsql security definer set search_path='' as $fn$
declare
  reasons jsonb := '[]'::jsonb;
  decision text := 'human_review';
  corpus text := coalesce(p_work.title,'')||E'\n'||coalesce(p_work.summary,'')
                 ||E'\n'||coalesce(p_work.body,'')||E'\n'||coalesce(p_work.code,'');
  is_duplicate boolean := false;
begin
  if p_work.status <> 'submitted' or p_work.deleted_at is not null then return; end if;

  -- R201: exact same-author duplicate. A candidate for rejection, not
  -- an automatic rejection; context (legitimate reposts) matters.
  select exists(
    select 1 from public.ghost_contributions other
    where other.id<>p_work.id and other.owner_id=p_work.owner_id
      and other.deleted_at is null and other.status in ('submitted','published')
      and other.kind=p_work.kind and other.title=p_work.title
      and other.summary=p_work.summary and other.body=p_work.body
      and other.code=p_work.code and other.source_url=p_work.source_url
  ) into is_duplicate;
  if is_duplicate then
    decision:='reject_candidate';
    reasons:=reasons||jsonb_build_array(jsonb_build_object(
      'rule','R201','finding','Exact match to another submitted or published work by the same author',
      'required_action','Confirm whether this is a permitted update/republication before rejecting'
    ));
  end if;

  -- R301: credential-like material. Never echo suspected secrets into logs.
  if corpus ~* '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
    or corpus ~ 'AKIA[0-9A-Z]{16}'
    or corpus ~ 'ghp_[A-Za-z0-9]{36}'
    or corpus ~ 'sk_live_[A-Za-z0-9]{8,}' then
    decision:='investigate';
    reasons:=reasons||jsonb_build_array(jsonb_build_object(
      'rule','R301','finding','Possible credential or private-key material',
      'required_action','Human investigation: verify consent and redact secrets before publishing'
    ));
  end if;

  -- R302: inherently sensitive technical artifact types need scope review.
  -- No content is rejected solely for discussing cybersecurity or malware.
  if p_work.kind in ('malware_samples','exploit_pocs','attack_simulations','adversary_emulation') then
    decision:='investigate';
    reasons:=reasons||jsonb_build_array(jsonb_build_object(
      'rule','R302','finding','Technical artifact category requires authorized-scope and release review',
      'required_action','Human investigation: confirm authorization, safe handling and publication scope'
    ));
  end if;

  if jsonb_array_length(reasons)=0 then
    reasons:=jsonb_build_array(jsonb_build_object(
      'rule','R001','finding','No deterministic escalation signal detected',
      'required_action','Human reviewer verifies quality, authorization and fit before publication'
    ));
  end if;

  insert into public.ghost_contribution_triage
    (contribution_id,version,policy_version,recommendation,signals,resolution)
  values (p_work.id,p_work.version,'LGN-TRIAGE-1',decision,reasons,
          case when decision='human_review' then 'not_required' else 'pending' end)
  on conflict(contribution_id,version) do nothing;
end $fn$;
revoke all on function lgn_private.apply_ghost_triage(public.ghost_contributions)
  from public,anon,authenticated;

create function lgn_private.triage_submitted_contribution()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
  if new.status='submitted' then
    if tg_op='INSERT' then
      perform lgn_private.apply_ghost_triage(new);
    elsif new.version<>old.version then
      perform lgn_private.apply_ghost_triage(new);
    end if;
  end if;
  return new;
end $fn$;
revoke all on function lgn_private.triage_submitted_contribution()
  from public,anon,authenticated;
create trigger triage_submitted_contribution_after_write
  after insert or update on public.ghost_contributions
  for each row execute function lgn_private.triage_submitted_contribution();

-- One existing privileged endpoint handles review and triage clearances.
-- It cannot publish a flagged version unless its investigation is cleared.
alter table public.ghost_contribution_reviews
  drop constraint ghost_contribution_reviews_action_check;
alter table public.ghost_contribution_reviews
  add constraint ghost_contribution_reviews_action_check
  check (action in ('revision_requested','rejected','published','triage_cleared'));

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
  if target.version<>p_expected_version then
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
revoke all on function public.review_ghost_contribution(uuid,integer,text,text)
  from public,anon,authenticated;
grant execute on function public.review_ghost_contribution(uuid,integer,text,text)
  to authenticated;

-- Retroactively evaluate already-submitted work without editing its content
-- or timestamp. The evaluator's ON CONFLICT rule makes this idempotent.
select lgn_private.apply_ghost_triage(c)
  from public.ghost_contributions c where c.status='submitted' and c.deleted_at is null;
commit;
