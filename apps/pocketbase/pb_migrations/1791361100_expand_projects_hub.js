/// <reference path="../pb_data/types.d.ts" />

// Turn the Projects page into a collaboration hub.
//
// Adds project-lifecycle fields to `ghost_work` so a project can advertise its
// status, the roles it needs, its technologies, repository, goals, scope,
// deliverables, milestones, and whether it is accepting contributors. The
// publication `status` (submitted/published/rejected) stays separate from the
// project lifecycle `project_status`.
//
// The update rule is relaxed for projects: a project's owner can manage its
// lifecycle fields (status, roles, milestones…) after publication, while the
// publication status, kind, owner, author, and example flag stay locked. Other
// contribution kinds keep the original "resubmit-on-edit" rule.
//
// Additive only — existing fields and rules are preserved.

migrate((app) => {
  const work = app.findCollectionByNameOrId('ghost_work');

  // --- Relax the update rule for project lifecycle management ---
  work.updateRule =
    "@request.auth.moderator = true || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted'))" +
    ")";

  // --- Project lifecycle fields ---
  if (!work.fields.getByName('project_status')) {
    work.fields.add(new SelectField({
      name: 'project_status',
      required: false,
      maxSelect: 1,
      values: ['proposed', 'recruiting', 'active', 'paused', 'complete', 'archived'],
    }));
  }
  if (!work.fields.getByName('roles_needed')) {
    work.fields.add(new TextField({ name: 'roles_needed', max: 500 }));
  }
  if (!work.fields.getByName('technologies')) {
    work.fields.add(new TextField({ name: 'technologies', max: 500 }));
  }
  if (!work.fields.getByName('repository')) {
    work.fields.add(new URLField({ name: 'repository' }));
  }
  if (!work.fields.getByName('goals')) {
    work.fields.add(new TextField({ name: 'goals', max: 5000 }));
  }
  if (!work.fields.getByName('scope')) {
    work.fields.add(new TextField({ name: 'scope', max: 5000 }));
  }
  if (!work.fields.getByName('deliverables')) {
    work.fields.add(new TextField({ name: 'deliverables', max: 5000 }));
  }
  if (!work.fields.getByName('milestones')) {
    work.fields.add(new TextField({ name: 'milestones', max: 5000 }));
  }
  if (!work.fields.getByName('accepting_contributors')) {
    work.fields.add(new BoolField({ name: 'accepting_contributors' }));
  }
  app.save(work);

  // --- Backfill the seeded example project ---
  try {
    const record = app.findFirstRecordByData('ghost_work', 'title', 'Detection Lab');
    record.set('project_status', 'recruiting');
    record.set('roles_needed', 'Detection Engineer, Windows Researcher, Python Developer');
    record.set('technologies', 'Sigma, Sysmon, Windows, Lab');
    record.set('accepting_contributors', true);
    record.set('goals', 'Build an isolated, reproducible environment for validating detection rules against synthetic telemetry, with a documented coverage matrix.');
    record.set('scope', 'Windows endpoint telemetry (Sysmon + Event Log). No production systems, no real secrets, no testing against third-party infrastructure.');
    record.set('deliverables', 'A documented lab setup guide, a synthetic event dataset, and a detection coverage matrix with benign test cases for each rule.');
    record.set('milestones', 'Define the test-event format\nDocument collection prerequisites\nBuild the coverage matrix\nPublish the validation method');
    app.save(record);
  } catch (_) { /* example project absent — skip */ }

  // Default project_status for any other existing project work.
  const records = app.findAllRecords('ghost_work');
  for (const record of records) {
    if (record.get('kind') === 'project') {
      const current = record.get('project_status');
      if (!current || current === '') {
        record.set('project_status', 'proposed');
        app.save(record);
      }
    }
  }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  for (const name of [
    'project_status', 'roles_needed', 'technologies', 'repository',
    'goals', 'scope', 'deliverables', 'milestones', 'accepting_contributors',
  ]) {
    try { work.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  // Restore the previous update rule.
  work.updateRule =
    "@request.auth.moderator = true || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && " +
    "(status != 'published' && @request.body.status = 'submitted')" +
    ")";
  app.save(work);
});
