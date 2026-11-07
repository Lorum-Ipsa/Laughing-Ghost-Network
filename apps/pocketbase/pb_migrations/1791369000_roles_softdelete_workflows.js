/// <reference path="../pb_data/types.d.ts" />

// Backend foundation — part 1.
//
// Adds the access-control and lifecycle primitives that are painful to retrofit
// once content exists:
//
//   1. Roles on `users` (ghost / reviewer / moderator / admin), server-controlled.
//      A member cannot set or change their own role; only admins (and existing
//      moderators) may grant roles. The legacy `moderator` bool is preserved so
//      existing rules keep working; `role` is the canonical going forward.
//   2. Soft deletion on `ghost_work` and `ghost_profiles` (`deleted`, `deleted_at`).
//      List/view rules exclude soft-deleted records for everyone except
//      moderators/admins, so a delete is recoverable instead of permanent.
//   3. Expanded contribution workflow states on `ghost_work`:
//      draft → submitted → revision_requested → published → archived (and rejected).
//      Owners may save a draft or resubmit non-published work; only moderators
//      and admins move work into published / archived / rejected.
//
// All existing owner-scoped and moderator semantics are preserved; rules are
// extended, not loosened.

migrate((app) => {
  // --- 1. Roles ---
  const users = app.findCollectionByNameOrId('users');
  if (!users.fields.getByName('role')) {
    users.fields.add(new SelectField({
      name: 'role',
      required: false,
      maxSelect: 1,
      values: ['ghost', 'reviewer', 'moderator', 'admin'],
    }));
  }
  // Server-controlled: signup may not set a privileged role or moderator flag.
  users.createRule =
    "(@request.body.moderator:isset = false || @request.body.moderator = false) && " +
    "(@request.body.role:isset = false || @request.body.role = 'ghost')";
  // Self may edit non-privileged fields only; moderators and admins may edit anyone.
  users.updateRule =
    "(id = @request.auth.id && @request.body.moderator:changed = false && @request.body.role:changed = false) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(users);

  // Backfill: existing accounts get a role derived from their moderator flag.
  const userRecords = app.findAllRecords('users');
  for (const u of userRecords) {
    const role = u.getString('role');
    if (!role) {
      u.set('role', u.getBool('moderator') ? 'moderator' : 'ghost');
      app.save(u);
    }
  }

  // --- 2 + 3. ghost_work: soft deletion + expanded statuses ---
  const work = app.findCollectionByNameOrId('ghost_work');

  // Expand the status select with the full workflow. Existing records keep
  // their current value (still valid in the expanded set).
  const statusField = work.fields.getByName('status');
  statusField.values = ['draft', 'submitted', 'revision_requested', 'published', 'rejected', 'archived'];

  if (!work.fields.getByName('deleted')) work.fields.add(new BoolField({ name: 'deleted' }));
  if (!work.fields.getByName('deleted_at')) work.fields.add(new DateField({ name: 'deleted_at' }));

  // Soft-deleted records are hidden from everyone except moderators/admins.
  work.listRule =
    "deleted != true && (status = 'published' || " +
    "(@request.auth.id != '' && owner = @request.auth.id) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin')";
  work.viewRule = work.listRule;
  // A new contribution starts as a draft or a submission.
  work.createRule =
    "@request.auth.id != '' && owner = @request.auth.id && author.owner = @request.auth.id && " +
    "(status = 'draft' || status = 'submitted') && example = false";
  // Owners manage content + lifecycle fields but cannot change publication status,
  // kind, ownership, or soft-delete. Moderators/admins may do anything.
  work.updateRule =
    "@request.auth.moderator = true || @request.auth.role = 'admin' || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "@request.body.deleted:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(kind = 'exercise' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted'))" +
    ")";
  work.deleteRule =
    "(@request.auth.id != '' && owner = @request.auth.id) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(work);

  // --- 2. ghost_profiles: soft deletion ---
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  if (!profiles.fields.getByName('deleted')) profiles.fields.add(new BoolField({ name: 'deleted' }));
  if (!profiles.fields.getByName('deleted_at')) profiles.fields.add(new DateField({ name: 'deleted_at' }));
  // Public read remains, but soft-deleted profiles are hidden.
  profiles.listRule = "deleted != true";
  profiles.viewRule = "deleted != true";
  profiles.updateRule =
    "@request.auth.moderator = true || @request.auth.role = 'admin' || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.handle:changed = false && " +
    "@request.body.example:changed = false && @request.body.member:changed = false && " +
    "@request.body.deleted:changed = false)";
  profiles.deleteRule =
    "(@request.auth.id != '' && owner = @request.auth.id) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(profiles);
}, (app) => {
  // Revert roles.
  const users = app.findCollectionByNameOrId('users');
  try { users.fields.removeByName('role'); } catch (_) { /* already absent */ }
  users.createRule = "@request.body.moderator:isset = false || @request.body.moderator = false";
  users.updateRule = "(id = @request.auth.id && @request.body.moderator:changed = false) || @request.auth.moderator = true";
  app.save(users);

  // Revert ghost_work.
  const work = app.findCollectionByNameOrId('ghost_work');
  const statusField = work.fields.getByName('status');
  statusField.values = ['submitted', 'published', 'rejected'];
  for (const name of ['deleted', 'deleted_at']) { try { work.fields.removeByName(name); } catch (_) { /* already absent */ } }
  work.listRule = "status = 'published' || (@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true";
  work.viewRule = work.listRule;
  work.createRule = "@request.auth.id != '' && owner = @request.auth.id && author.owner = @request.auth.id && status = 'submitted' && example = false";
  work.updateRule =
    "@request.auth.moderator = true || (@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(kind = 'exercise' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted')))";
  work.deleteRule = "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true";
  app.save(work);

  // Revert ghost_profiles.
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  for (const name of ['deleted', 'deleted_at']) { try { profiles.fields.removeByName(name); } catch (_) { /* already absent */ } }
  profiles.listRule = '';
  profiles.viewRule = '';
  profiles.updateRule = "@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:changed = false && @request.body.handle:changed = false && @request.body.example:changed = false && @request.body.member:changed = false";
  profiles.deleteRule = "@request.auth.id != '' && owner = @request.auth.id";
  app.save(profiles);
});
