# Projects development acceptance

This slice adds a Supabase workspace for private project drafts, public project briefs, requests to join, maintainer decisions, and a private task board. It does not depend on the pending Contributions migrations.

- [ ] After approval, apply [the Projects SQL](projects-workspace.sql) to `lgn-development`.
- [ ] Run the [rollback-only SQL acceptance](projects-workspace-acceptance.sql). Before applying the SQL permanently, paste the migration immediately after `begin;` in a temporary copy of the acceptance script.
- [ ] Sign in as verified Ghost A. Open **Ghost Space → Projects**, create a private project and a task. Confirm a signed-out visitor cannot see the project.
- [ ] Publish the brief and enable recruiting. As a signed-out visitor, confirm it appears on **Projects** without task or membership details.
- [ ] As verified Ghost B, follow the project link and request membership. Confirm the task board is hidden until A accepts the request.
- [ ] As A, accept B and move the task to In Progress. Confirm B can read the new status and cannot edit it. Remove B and confirm their task access ends.
- [ ] Archive the project. Confirm it disappears from the public directory and is still visible to A.

Private briefs and tasks are visible to the maintainer. Accepted members see tasks while the project brief remains public and unarchived. A public project is created by an explicit setting change from its private default. Public listings exclude archived work. The public Projects page keeps historical PocketBase listings separate until those records are reconciled and imported.

Project invitations, role postings, watching, task assignments, milestones, progress updates, and historical import remain follow-up slices. The migration remains pending. If rolling back after data has been created, preserve the three Projects tables and disable the new UI while preparing a reviewed rollback.
