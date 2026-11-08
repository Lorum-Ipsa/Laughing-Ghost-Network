# Table Talks Phase 1 acceptance

New Table Talks use Supabase. Facilitators draft and publish briefs, schedule and run exercises, assign roles, prepare scenarios and decision points, and write debriefs. Open and scheduled exercises accept registrations from verified active Ghosts. Materials unlock at the start. Each participant can see their own decisions, and the facilitator can see all decisions. The debrief unlocks on completion. Public routes read briefs only.


## Development and hands-on acceptance

- [x] Apply [the Table Talks migration](table-talks-workspace.sql) to `lgn-development` as `20261108101201_phase1_table_talks_workspace`. All 13 [rollback-only database assertions](table-talks-workspace-acceptance.sql) passed before and after rollout.
- [ ] Verify frontend build, typecheck and PocketBase-free route smoke check.
- [ ] As facilitator A, create a draft and add synthetic objectives, scenario, timeline, injects, evidence and decision points. Confirm a visitor cannot find the draft.
- [ ] Open or schedule the exercise. Verify the visitor sees only the brief and time. As B, register and confirm materials remain hidden before the start.
- [ ] As A, assign B a role and start the exercise. Confirm B sees materials and can record a decision with rationale. Verify a separate member cannot see B's decision.
- [ ] As A, read B's decision and prepare the debrief. As B, confirm the debrief stays private until A completes the session.
- [ ] Complete the exercise. Confirm B can read the debrief, late decisions are rejected, and visitors still cannot read materials or participant data.
- [ ] Archive the session. Confirm it disappears from the public list and remains visible to A.

The cutover uses Supabase for member records and keeps the original fictional exercise in the public library as built-in content. The maintainer confirmed there were no active legacy accounts to reconcile. Obtain final approval before merge or production deployment.
