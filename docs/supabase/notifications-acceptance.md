# Notifications Phase 1 acceptance

The Supabase inbox covers contribution review outcomes, project invitations and membership decisions, task assignments and progress updates, Table Talk role changes, scheduling, starts, completions and decisions, and collaboration requests and outcomes. Each notice links back to the workspace. The notice never copies the originating message, review note, or decision. In-app preferences default to enabled and control future notices per category.

- [x] Apply [the notification migration](notifications-workspace.sql) to `lgn-development` as `20261108103356_phase1_notifications_workspace`. All 11 [automated database assertions](notifications-workspace-acceptance.sql) passed before and after rollout.
- [ ] Verify frontend build, typecheck, and migrated-route smoke check.
- [ ] As Ghost A, send B a collaboration request. As B, open Notifications and verify the unread item and Network link. Accept it and verify A receives an outcome.
- [ ] As B, mark the notice read and unread, archive it, then restore it. Check the filters and Mark all read across pages.
- [ ] Disable Collaboration notices as B and repeat with a new pending request. Confirm the old notice stays in history and the request still appears in Network. Re-enable notices for subsequent events.
- [ ] Generate a project invitation, assignment, progress update, Table Talk start and contribution review using synthetic fixtures. Confirm only the intended account receives each notice and the link opens the correct workspace.
- [ ] Confirm a third account cannot see the inbox or preferences, and signed-out visitors cannot access them.
- [ ] Reconcile any approved historical PocketBase notifications before retiring their source. Obtain final approval before merge or production deployment.

This slice is in-app only. Email, push delivery, live updates and security-alert policy are separate work. Notifications refresh when opening the inbox or selecting Refresh.

## Followed publications

- [ ] Enable **New work from Ghosts I follow**, then have a followed Ghost publish a synthetic contribution. Confirm one notice links to the article. Verify drafts, later edits, and new work after unfollowing do not generate notices. This preference is off by default and is independent of review notices.
