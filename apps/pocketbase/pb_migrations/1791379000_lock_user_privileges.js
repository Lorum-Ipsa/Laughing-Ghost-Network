/// <reference path="../pb_data/types.d.ts" />

// Final users rule, after the exported historical migrations.
// The previous rule allowed any legacy moderator to change another user's
// role, moderator flag, verified status or suspension flag. Only an LGN admin
// may change another account. Members (including moderators) may edit their
// own non-privileged fields. The browser /admin guard is never authoritative.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.updateRule =
    "@request.auth.role = 'admin' || (" +
    "@request.auth.id != '' && id = @request.auth.id && " +
    "@request.body.moderator:changed = false && " +
    "@request.body.role:changed = false && " +
    "@request.body.suspended:changed = false && " +
    "@request.body.verified:changed = false)";
  app.save(users);
}, (app) => {
  // Preserve restrictions on rollback rather than restoring an unsafe rule.
});
