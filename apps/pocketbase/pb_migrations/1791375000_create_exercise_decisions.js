/// <reference path="../pb_data/types.d.ts" />

// Table Talks workspace — participant decisions.
//
// Table Talks is a practice environment for decision-making. The exercise
// scenario, timeline, injects, evidence, and debrief already live on
// `ghost_work` (kind = 'exercise'); participant membership already lives on
// `ghost_participations` (relation = contributor / watcher / request / invited,
// with a `role` for the assigned scenario role).
//
// This migration adds the one missing piece: the decisions a participant
// submits during an exercise — the decision point they are responding to, the
// decision they made, and their rationale. A participant sees only their own
// decisions; the facilitator (the exercise's owner) sees every participant's
// decisions. No scores, rankings, or competitive metrics — only the reasoning.
//
// Reads are scoped to published exercises; the author and the facilitator can
// read a decision. The author may edit or delete their own decision; the
// facilitator may delete any decision on their exercise.

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const work = app.findCollectionByNameOrId('ghost_work');

  try { app.findCollectionByNameOrId('ghost_exercise_decisions'); }
  catch (_) {
    const decisions = new Collection({
      name: 'ghost_exercise_decisions',
      type: 'base',
      // The author sees their own decisions; the exercise facilitator sees all.
      listRule: "work.status = 'published' && (owner = @request.auth.id || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      viewRule: "work.status = 'published' && (owner = @request.auth.id || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      createRule: "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published' && work.kind = 'exercise'",
      updateRule: "owner = @request.auth.id",
      deleteRule: "owner = @request.auth.id || work.owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'role', type: 'text', max: 100 },
        { name: 'decision_point', type: 'text', required: true, max: 500 },
        { name: 'decision', type: 'text', required: true, max: 2000 },
        { name: 'rationale', type: 'text', max: 5000 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(decisions);
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('ghost_exercise_decisions')); } catch (_) { /* already absent */ }
});
