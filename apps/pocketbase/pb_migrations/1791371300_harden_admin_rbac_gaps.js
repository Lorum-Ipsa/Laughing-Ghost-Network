/// <reference path="../pb_data/types.d.ts" />

// Hardens Admin authorization by closing three access-rule gaps where an admin
// (role = 'admin') without the legacy `moderator` bool was locked out of an
// operation the Admin dashboard performs directly against PocketBase.
//
// The session lives in localStorage, so the /admin clientLoader guard is a UX
// gate only — the real authorization boundary is the collection access rules
// evaluated server-side by PocketBase on every request. These three collections
// still gated on `@request.auth.moderator = true` alone, so an admin who never
// had the bool set (e.g. promoted via role only) could not perform the action
// and, worse, the UI would surface a confusing 403. Each now also accepts
// `@request.auth.role = 'admin'`, matching the moderator-as-superset pattern
// established in 1791370500.
//
//   1. ghost_reports.deleteRule   — admins dismiss reports from the Admin panel.
//   2. ghost_applications.updateRule — admins decide membership applications.
//   3. ghost_notifications list/view/delete — admins manage notifications from
//      Admin → Settings (previously owner-only, so an admin saw an empty list
//      and could not remove stale system-generated entries).
//
// No field schema changes; rules only. Owner and moderator semantics preserved.

migrate((app) => {
  const reports = app.findCollectionByNameOrId('ghost_reports');
  reports.deleteRule = "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(reports);

  const applications = app.findCollectionByNameOrId('ghost_applications');
  applications.updateRule = "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(applications);

  const notifications = app.findCollectionByNameOrId('ghost_notifications');
  notifications.listRule =
    "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.role = 'admin'";
  notifications.viewRule =
    "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.role = 'admin'";
  notifications.deleteRule =
    "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.role = 'admin'";
  app.save(notifications);
}, (app) => {
  const reports = app.findCollectionByNameOrId('ghost_reports');
  reports.deleteRule = '@request.auth.moderator = true';
  app.save(reports);

  const applications = app.findCollectionByNameOrId('ghost_applications');
  applications.updateRule = '@request.auth.moderator = true';
  app.save(applications);

  const notifications = app.findCollectionByNameOrId('ghost_notifications');
  notifications.listRule = "@request.auth.id != '' && owner = @request.auth.id";
  notifications.viewRule = "@request.auth.id != '' && owner = @request.auth.id";
  notifications.deleteRule = "@request.auth.id != '' && owner = @request.auth.id";
  app.save(notifications);
});
