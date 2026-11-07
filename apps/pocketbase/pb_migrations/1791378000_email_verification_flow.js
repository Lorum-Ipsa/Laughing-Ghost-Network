/// <reference path="../pb_data/types.d.ts" />

// Email verification flow + account-state gating.
//
// 1. Sets the site URL from LGN_APP_URL for this environment so the verification email
//    link (built in ghost-verification.pb.js) and password-reset links point
//    at the configured environment. A standalone PocketBase instance needs
//    its own SMTP/provider configuration for sending mail.
// 2. Locks the `verified` system field on `users.updateRule` so a member
//    cannot flip their own verification state through the records API. Only
//    the verification flow (confirmVerification) or an admin/moderator may set
//    it. `verified` is a system field, but the explicit `:changed = false`
//    guard is defense-in-depth.
// 3. Gates contribution, participation, exercise-decision, collaboration, and
//    project-role/task/update creation on a verified account. Unverified
//    members may sign in and resend the verification email, but cannot
//    publish, join projects, participate in Table Talks, or create other
//    network artifacts until verified. Admins and moderators are exempt.

const VERIFIED_OR_STAFF =
  "(@request.auth.verified = true || @request.auth.role = 'admin' || @request.auth.moderator = true)";

migrate((app) => {
  // --- 1. Site URL ---
  const settings = app.settings();
  settings.meta.appUrl = $os.getenv('LGN_APP_URL') || 'http://localhost:3000';
  app.save(settings);

  // --- 2. Lock `verified` on users.updateRule ---
  const users = app.findCollectionByNameOrId('users');
  users.updateRule =
    "(id = @request.auth.id && @request.body.moderator:changed = false && " +
    "@request.body.role:changed = false && @request.body.suspended:changed = false && " +
    "@request.body.verified:changed = false) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(users);

  // Let an owner see their own soft-deleted profile so they can reactivate it.
  // Public/anonymous viewers still only see non-deleted profiles (the owner
  // clause is false without auth).
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  profiles.listRule = "deleted != true || (@request.auth.id != '' && owner = @request.auth.id)";
  profiles.viewRule = "deleted != true || (@request.auth.id != '' && owner = @request.auth.id)";
  app.save(profiles);

  // --- 3. Gate creates on verified (admins/moderators exempt) ---
  const work = app.findCollectionByNameOrId('ghost_work');
  work.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && author.owner = @request.auth.id && " +
    "(status = 'draft' || status = 'submitted') && example = false && " + VERIFIED_OR_STAFF;
  app.save(work);

  const participations = app.findCollectionByNameOrId('ghost_participations');
  participations.createRule =
    "@request.auth.id != '' && work.status = 'published' && " +
    "(work.kind = 'project' || work.kind = 'exercise') && " +
    "(owner = @request.auth.id || work.owner = @request.auth.id) && " + VERIFIED_OR_STAFF;
  app.save(participations);

  const decisions = app.findCollectionByNameOrId('ghost_exercise_decisions');
  decisions.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published' && " +
    "work.kind = 'exercise' && " + VERIFIED_OR_STAFF;
  app.save(decisions);

  const collab = app.findCollectionByNameOrId('ghost_collaboration_requests');
  collab.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && " + VERIFIED_OR_STAFF;
  app.save(collab);

  const roles = app.findCollectionByNameOrId('ghost_project_roles');
  roles.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id && " + VERIFIED_OR_STAFF;
  app.save(roles);

  const tasks = app.findCollectionByNameOrId('ghost_project_tasks');
  tasks.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id && " + VERIFIED_OR_STAFF;
  app.save(tasks);

  const updates = app.findCollectionByNameOrId('ghost_project_updates');
  updates.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id && " + VERIFIED_OR_STAFF;
  app.save(updates);
}, (app) => {
  // Revert site URL is not safely reversible to an unknown prior value; leave
  // appUrl as set. Revert the rules instead.

  const users = app.findCollectionByNameOrId('users');
  users.updateRule =
    "(id = @request.auth.id && @request.body.moderator:changed = false && " +
    "@request.body.role:changed = false && @request.body.suspended:changed = false) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(users);

  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  profiles.listRule = 'deleted != true';
  profiles.viewRule = 'deleted != true';
  app.save(profiles);

  const work = app.findCollectionByNameOrId('ghost_work');
  work.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && author.owner = @request.auth.id && " +
    "(status = 'draft' || status = 'submitted') && example = false";
  app.save(work);

  const participations = app.findCollectionByNameOrId('ghost_participations');
  participations.createRule =
    "@request.auth.id != '' && work.status = 'published' && " +
    "(work.kind = 'project' || work.kind = 'exercise') && " +
    "(owner = @request.auth.id || work.owner = @request.auth.id)";
  app.save(participations);

  const decisions = app.findCollectionByNameOrId('ghost_exercise_decisions');
  decisions.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published' && work.kind = 'exercise'";
  app.save(decisions);

  const collab = app.findCollectionByNameOrId('ghost_collaboration_requests');
  collab.createRule = "@request.auth.id != '' && owner = @request.auth.id";
  app.save(collab);

  const roles = app.findCollectionByNameOrId('ghost_project_roles');
  roles.createRule = "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id";
  app.save(roles);

  const tasks = app.findCollectionByNameOrId('ghost_project_tasks');
  tasks.createRule = "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id";
  app.save(tasks);

  const updates = app.findCollectionByNameOrId('ghost_project_updates');
  updates.createRule = "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id";
  app.save(updates);
});
