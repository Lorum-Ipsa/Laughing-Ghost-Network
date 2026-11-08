-- Exported directly from the already-applied LGN development migration history.
-- DO NOT replay on the existing project. A clean CLI baseline is pending.

-- Review queue access is an additional SELECT case, not a broad read policy.
-- Combining predicates avoids redundant permissive RLS policy evaluations.
begin;
drop policy "reviewers see the submitted queue"
  on public.ghost_contributions;
drop policy "member sees own contributions or published work"
  on public.ghost_contributions;
create policy "members see own, published, or submitted review queue"
  on public.ghost_contributions for select to authenticated
  using (
    deleted_at is null and (
      status='published'
      or owner_id=(select auth.uid())
      or (status='submitted' and (select lgn_private.can_review_contributions()))
    )
  );
create index ghost_contribution_reviews_reviewer_idx
  on public.ghost_contribution_reviews(reviewer_id);
commit;
