/// <reference path="../pb_data/types.d.ts" />

// Role-based access control for the Admin layer.
//
// The four-role hierarchy (ghost / reviewer / moderator / admin) already exists
// on `users` and is server-controlled (create/update rules lock `role` and
// `moderator` so an ordinary member cannot self-promote). This migration adds
// the remaining pieces the Admin dashboard depends on:
//
//   1. Account suspension (`suspended` bool) — admins may suspend/reactivate a
//      member. Suspended members are blocked at auth time via `authRule`, and
//      the field is locked exactly like `role` so a member cannot unsuspend
//      themselves.
//   2. Admin visibility of the user roster — `listRule`/`viewRule` on `users`
//      now also allow `@request.auth.role = 'admin'` so the Admin dashboard can
//      list every account (emails included) for role and suspension management.
//      Non-admins still see only their own record.
//   3. Admin-as-superset-of-moderator — `ghost_reports`, `ghost_applications`,
//      and `ghost_participations` previously gated on `@request.auth.moderator`
//      only; an admin without the legacy `moderator` bool was locked out. All
//      three now also accept `@request.auth.role = 'admin'`.
//
migrate((app) => {
  // --- 1 + 2. users: suspension field + admin roster visibility ---
  const users = app.findCollectionByNameOrId('users');
  if (!users.fields.getByName('suspended')) {
    users.fields.add(new BoolField({ name: 'suspended' }));
  }

  // Admins may list/view every account; everyone else only their own.
  users.listRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  users.viewRule = "id = @request.auth.id || @request.auth.role = 'admin'";

  // Signup may not set a privileged flag or suspend anyone.
  users.createRule =
    "(@request.body.moderator:isset = false || @request.body.moderator = false) && " +
    "(@request.body.role:isset = false || @request.body.role = 'ghost') && " +
    "(@request.body.suspended:isset = false || @request.body.suspended = false)";

  // Self may edit only non-privileged fields; moderators/admins may edit anyone.
  users.updateRule =
    "(id = @request.auth.id && @request.body.moderator:changed = false && " +
    "@request.body.role:changed = false && @request.body.suspended:changed = false) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";

  // Block suspended members from authenticating.
  users.authRule = "suspended != true";
  app.save(users);

  // Keep existing user roles unchanged. Admin ownership must be provisioned by
  // an authenticated PocketBase superuser through a controlled setup step.
  // Normalize only the nullable suspension field during migration.
  const userRecords = app.findAllRecords('users');
  for (const u of userRecords) {
    if (u.get('suspended') === null) {
      u.set('suspended', false);
      app.save(u);
    }
  }

  // --- 3. Admin-as-superset-of-moderator on the three moderator-only collections ---
  const reports = app.findCollectionByNameOrId('ghost_reports');
  reports.listRule = "@request.auth.moderator = true || @request.auth.role = 'admin'";
  reports.viewRule = "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(reports);

  const applications = app.findCollectionByNameOrId('ghost_applications');
  applications.listRule = "owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'";
  applications.viewRule = "owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(applications);

  const participations = app.findCollectionByNameOrId('ghost_participations');
  participations.listRule = "owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'";
  participations.viewRule = "owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(participations);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  try { users.fields.removeByName('suspended'); } catch (_) { /* already absent */ }
  users.listRule = 'id = @request.auth.id';
  users.viewRule = 'id = @request.auth.id';
  users.createRule =
    "(@request.body.moderator:isset = false || @request.body.moderator = false) && " +
    "(@request.body.role:isset = false || @request.body.role = 'ghost')";
  users.updateRule =
    "(id = @request.auth.id && @request.body.moderator:changed = false && @request.body.role:changed = false) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  users.authRule = '';
  app.save(users);

  const reports = app.findCollectionByNameOrId('ghost_reports');
  reports.listRule = '@request.auth.moderator = true';
  reports.viewRule = '@request.auth.moderator = true';
  app.save(reports);

  const applications = app.findCollectionByNameOrId('ghost_applications');
  applications.listRule = 'owner = @request.auth.id || @request.auth.moderator = true';
  applications.viewRule = 'owner = @request.auth.id || @request.auth.moderator = true';
  app.save(applications);

  const participations = app.findCollectionByNameOrId('ghost_participations');
  participations.listRule = 'owner = @request.auth.id || @request.auth.moderator = true';
  participations.viewRule = 'owner = @request.auth.id || @request.auth.moderator = true';
  app.save(participations);
});
