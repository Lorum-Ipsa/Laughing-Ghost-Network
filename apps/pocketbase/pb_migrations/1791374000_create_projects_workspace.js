/// <reference path="../pb_data/types.d.ts" />

// Projects workspace — the collaboration layer inside Ghost Space.
//
// Turns Projects from a showcase into a working collaboration surface. A
// maintainer can define open roles (with skills, commitment, location,
// description), invite Ghosts, accept or remove contributors, assign roles,
// create tasks, post project updates, and manage milestones. Other Ghosts can
// request to join a role or watch a project.
//
// Adds three new collections and extends `ghost_participations`:
//   - ghost_project_tasks   — per-project tasks (open / in_progress / complete)
//   - ghost_project_updates — maintainer posts / progress updates
//   - ghost_project_roles   — open roles a Ghost can apply to
//   - ghost_participations  — gains `role` + `relation` (contributor / watcher /
//                            request / invited) so one record models every
//                            membership state. The create rule now also lets a
//                            project's maintainer invite another Ghost; the
//                            update/delete rules let the maintainer manage
//                            membership of their own project.
//
// No existing fields are removed; reads stay scoped to published work (or the
// project owner / moderators) so unpublished drafts stay private.

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const work = app.findCollectionByNameOrId('ghost_work');

  // --- 1. Extend ghost_participations with role + relation ---
  const parts = app.findCollectionByNameOrId('ghost_participations');
  if (!parts.fields.getByName('role')) {
    parts.fields.add(new TextField({ name: 'role', max: 100 }));
  }
  if (!parts.fields.getByName('relation')) {
    parts.fields.add(new SelectField({
      name: 'relation',
      maxSelect: 1,
      values: ['contributor', 'watcher', 'request', 'invited'],
    }));
  }
  // Self-creation (request / watch / contribute) OR maintainer invitation.
  parts.createRule =
    "@request.auth.id != '' && work.status = 'published' && " +
    "(work.kind = 'project' || work.kind = 'exercise') && " +
    "(owner = @request.auth.id || work.owner = @request.auth.id)";
  // The member themselves or the project maintainer may update; moderators/admins too.
  parts.updateRule =
    "owner = @request.auth.id || work.owner = @request.auth.id || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  // The member or the project maintainer may remove a participation.
  parts.deleteRule =
    "owner = @request.auth.id || work.owner = @request.auth.id || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  app.save(parts);

  // Backfill existing participations as contributors.
  const partRecords = app.findAllRecords('ghost_participations');
  for (const p of partRecords) {
    if (!p.get('relation')) { p.set('relation', 'contributor'); app.save(p); }
  }

  // --- 2. ghost_project_tasks ---
  try { app.findCollectionByNameOrId('ghost_project_tasks'); }
  catch (_) {
    const tasks = new Collection({
      name: 'ghost_project_tasks',
      type: 'base',
      listRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id",
      updateRule: "work.owner = @request.auth.id || assigned_to = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      deleteRule: "work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'description', type: 'text', max: 5000 },
        { name: 'assigned_to', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'skill', type: 'text', max: 200 },
        { name: 'due_date', type: 'date' },
        { name: 'related_artifact', type: 'relation', collectionId: work.id, maxSelect: 1 },
        { name: 'status', type: 'select', maxSelect: 1, values: ['open', 'in_progress', 'complete'] },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(tasks);
  }

  // --- 3. ghost_project_updates ---
  try { app.findCollectionByNameOrId('ghost_project_updates'); }
  catch (_) {
    const updates = new Collection({
      name: 'ghost_project_updates',
      type: 'base',
      listRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id",
      updateRule: "work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      deleteRule: "work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'body', type: 'text', required: true, max: 10000 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(updates);
  }

  // --- 4. ghost_project_roles (open roles a Ghost can apply to) ---
  try { app.findCollectionByNameOrId('ghost_project_roles'); }
  catch (_) {
    const roles = new Collection({
      name: 'ghost_project_roles',
      type: 'base',
      listRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule: "work.status = 'published' || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && owner = @request.auth.id && work.owner = @request.auth.id",
      updateRule: "work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      deleteRule: "work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 100 },
        { name: 'skills', type: 'text', max: 300 },
        { name: 'commitment', type: 'select', maxSelect: 1, values: ['flexible', 'part_time', 'full_time', 'ad_hoc'] },
        { name: 'location', type: 'text', max: 100 },
        { name: 'description', type: 'text', max: 2000 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(roles);
  }
}, (app) => {
  // Revert participations changes.
  const parts = app.findCollectionByNameOrId('ghost_participations');
  try { parts.fields.removeByName('role'); } catch (_) { /* already absent */ }
  try { parts.fields.removeByName('relation'); } catch (_) { /* already absent */ }
  parts.createRule = "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published' && (work.kind = 'project' || work.kind = 'exercise')";
  parts.updateRule = null;
  parts.deleteRule = 'owner = @request.auth.id';
  app.save(parts);

  for (const name of ['ghost_project_tasks', 'ghost_project_updates', 'ghost_project_roles']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already absent */ }
  }
});
