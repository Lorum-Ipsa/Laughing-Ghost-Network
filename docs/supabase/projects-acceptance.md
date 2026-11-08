# Projects final approval and deployment checklist

The Supabase workspace supports private drafts, public briefs, recruiting, role applications, direct invitations, private watch lists, task assignments, progress updates, and milestones. Invitations appear in the invited Ghost's Projects workspace. They do not send email. Watching saves a project to the member's workspace without enrolling them or sending notifications. Task boards, milestones, updates, and member records are not exposed in the public listing.

Development SQL and automated database acceptance are complete. Hands-on browser acceptance, final approval, and production deployment are pending. Keep PR #3 in draft until the maintainer approves merging.

## Development rollout and checks

- [x] Apply these SQL files to `lgn-development` in order. The remote migration is `20261108100006_phase1_projects_workspace`. [Workspace](projects-workspace.sql), [assignments and updates](projects-collaboration.sql), [roles, invitations, watches and milestones](projects-planning.sql).
- [x] Pass all 27 [rollback-only SQL checks](projects-workspace-acceptance.sql). To run before persistent rollout, insert all three SQL files in order immediately after `begin;` in a temporary copy of the script.
- [ ] Run the frontend build, typecheck and preview smoke checks.
- [ ] As verified Ghost A, create a private project, task, and milestone. Confirm none are visible to a signed-out visitor.
- [ ] As A, publish the brief, enable recruiting, and post a role. Confirm a visitor sees the brief and open role without private collaboration data.
- [ ] As verified Ghost B, watch the project. Confirm it appears in B's workspace without membership and that A cannot see the watch. Unwatch and verify the record is removed.
- [ ] As B, request a posted role. Confirm A sees the role on the request, B cannot self-approve, and a closed role disappears from the public listing.
- [ ] As A, accept B, assign a task, post an update, and complete a milestone. Confirm B can view project progress and change only the status of tasks assigned to B.
- [ ] Remove B and confirm their task assignment clears and private access ends. Invite B by exact handle, then verify only B can accept. Confirm A can cancel an outstanding invitation and B can decline one.
- [ ] Archive the project. Confirm it remains visible to A and disappears from public listings.

## Cutover and deployment

- [ ] Record final approval, staging and production migration order, data backup, and rollback ownership. Confirm release approval before merge or deployment.

If rollback is required after Projects data exists, preserve the Supabase tables and disable the affected UI while preparing a reviewed rollback. Accepted members can access collaboration details while the brief is public and unarchived. Changing the brief to private makes it maintainer-only.

The cutover uses Supabase for member records and keeps the original fictional project in the public library as built-in content. The maintainer confirmed there were no active legacy accounts to reconcile. Obtain final approval before merge or production deployment.
