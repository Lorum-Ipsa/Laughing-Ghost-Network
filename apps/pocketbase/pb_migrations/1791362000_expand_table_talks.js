/// <reference path="../pb_data/types.d.ts" />

// Turn Table Talks into a cybersecurity practice and decision-making
// environment.
//
// Adds exercise metadata and structured scenario fields to `ghost_work` so an
// exercise carries its own lifecycle and practice context — exercise type,
// scenario domain, difficulty, duration, format (individual/team), delivery
// (live/self-paced), exercise status, industry, and the structured sections a
// real exercise needs (objectives, initial conditions, timeline, injects,
// evidence, decision points, facilitator notes, debrief, lessons learned).
//
// The publication `status` (submitted/published/rejected) stays separate from
// the exercise lifecycle `exercise_status`. The update rule is relaxed for
// exercises exactly as it is for projects: an exercise's owner can manage its
// lifecycle and scenario fields after publication, while the publication
// status, kind, owner, author, and example flag stay locked.
//
// Additive only — existing fields and rules are preserved.

migrate((app) => {
  const work = app.findCollectionByNameOrId('ghost_work');

  // --- Relax the update rule so exercise owners can manage lifecycle fields ---
  work.updateRule =
    "@request.auth.moderator = true || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(kind = 'exercise' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted'))" +
    ")";

  // --- Exercise metadata fields ---
  if (!work.fields.getByName('exercise_type')) {
    work.fields.add(new SelectField({
      name: 'exercise_type',
      required: false,
      maxSelect: 1,
      values: [
        'tabletop_exercise', 'incident_simulation', 'threat_hunting',
        'investigation', 'detection_exercise', 'malware_analysis',
        'red_blue_team', 'crisis_decision', 'executive', 'technical_drill',
        'case_study', 'after_action_review',
      ],
    }));
  }
  if (!work.fields.getByName('scenario_type')) {
    work.fields.add(new SelectField({
      name: 'scenario_type',
      required: false,
      maxSelect: 1,
      values: [
        'ransomware', 'identity_compromise', 'cloud_incident', 'insider_threat',
        'supply_chain', 'web_appsec', 'malware', 'credential_theft',
        'lateral_movement', 'data_exfiltration', 'ot_ics', 'healthcare',
        'ai_security', 'physical_cyber', 'third_party_compromise',
      ],
    }));
  }
  if (!work.fields.getByName('difficulty')) {
    work.fields.add(new SelectField({
      name: 'difficulty',
      required: false,
      maxSelect: 1,
      values: ['beginner', 'intermediate', 'advanced', 'expert'],
    }));
  }
  if (!work.fields.getByName('duration')) {
    work.fields.add(new SelectField({
      name: 'duration',
      required: false,
      maxSelect: 1,
      values: ['30', '30-60', '60-90', '90-120', '120+', 'self-paced'],
    }));
  }
  if (!work.fields.getByName('format_mode')) {
    work.fields.add(new SelectField({
      name: 'format_mode',
      required: false,
      maxSelect: 1,
      values: ['individual', 'team'],
    }));
  }
  if (!work.fields.getByName('delivery')) {
    work.fields.add(new SelectField({
      name: 'delivery',
      required: false,
      maxSelect: 1,
      values: ['live', 'self_paced'],
    }));
  }
  if (!work.fields.getByName('exercise_status')) {
    work.fields.add(new SelectField({
      name: 'exercise_status',
      required: false,
      maxSelect: 1,
      values: ['draft', 'open', 'scheduled', 'completed', 'archived'],
    }));
  }
  if (!work.fields.getByName('industry')) {
    work.fields.add(new TextField({ name: 'industry', max: 300 }));
  }

  // --- Structured scenario sections ---
  if (!work.fields.getByName('objectives')) {
    work.fields.add(new TextField({ name: 'objectives', max: 5000 }));
  }
  if (!work.fields.getByName('initial_conditions')) {
    work.fields.add(new TextField({ name: 'initial_conditions', max: 5000 }));
  }
  if (!work.fields.getByName('timeline')) {
    work.fields.add(new TextField({ name: 'timeline', max: 5000 }));
  }
  if (!work.fields.getByName('injects')) {
    work.fields.add(new TextField({ name: 'injects', max: 5000 }));
  }
  if (!work.fields.getByName('evidence')) {
    work.fields.add(new TextField({ name: 'evidence', max: 5000 }));
  }
  if (!work.fields.getByName('decision_points')) {
    work.fields.add(new TextField({ name: 'decision_points', max: 5000 }));
  }
  if (!work.fields.getByName('facilitator_notes')) {
    work.fields.add(new TextField({ name: 'facilitator_notes', max: 5000 }));
  }
  if (!work.fields.getByName('debrief')) {
    work.fields.add(new TextField({ name: 'debrief', max: 5000 }));
  }
  if (!work.fields.getByName('lessons_learned')) {
    work.fields.add(new TextField({ name: 'lessons_learned', max: 5000 }));
  }

  app.save(work);

  // --- Backfill the seeded example exercise ---
  try {
    const record = app.findFirstRecordByData('ghost_work', 'title', 'Table Talk #01 — Cloud incident');
    record.set('exercise_type', 'tabletop_exercise');
    record.set('scenario_type', 'cloud_incident');
    record.set('difficulty', 'intermediate');
    record.set('duration', '60-90');
    record.set('format_mode', 'team');
    record.set('delivery', 'self_paced');
    record.set('exercise_status', 'open');
    record.set('industry', 'Cloud');
    record.set('domain', 'Cloud Security, Incident Response');
    record.set('roles_needed', 'Analyst, Incident Lead');
    record.set('platform', 'AWS, Cloud');
    record.set('body', 'SCENARIO OVERVIEW\nA synthetic cloud tenant with audit logging enabled receives an IAM alert: a service account has created a new access key outside its usual maintenance window. Minutes later, a read permission is added to a role the account can assume. The on-call analyst must decide what to request, which hypotheses to test, and what containment is proportionate — before the situation is fully understood.\n\nThis is a tabletop exercise. No access to a real infrastructure is required. The goal is not to find the one right answer but to make the reasoning observable, comparable, and reusable.');
    record.set('objectives', 'Practice triaging an IAM alert under incomplete information. Compare competing hypotheses before acting. Document decisions and their rationale. Communicate uncertainty without overstating confidence.');
    record.set('initial_conditions', 'A synthetic cloud tenant with audit logging enabled. A service account named svc-reporting normally creates one access key per quarter during a maintenance window. No production systems or real credentials are involved.');
    record.set('timeline', 'T+00 — svc-reporting creates a new access key outside its usual window.\nT+10 — a read permission is added to a role the service account can assume.\nT+25 — a short-lived API session queries object metadata from a bucket the account does not normally touch.\nT+40 — the alert reaches the on-call analyst.');
    record.set('injects', 'Inject 1 — the IAM alert with the key-creation event.\nInject 2 — the role-permission change audit entry.\nInject 3 — a partial CloudTrail excerpt showing the metadata API call.\nInject 4 — a stakeholder asking whether to disable the account immediately.');
    record.set('evidence', 'Synthetic CloudTrail events (key creation, role update, API call). IAM policy snapshot before and after the change. A redacted session activity log. All data is fabricated for the exercise.');
    record.set('decision_points', 'Disable the service account now or continue gathering context? Which hypotheses explain a benign key creation? What is the proportionate containment given the evidence? How do you escalate without confirming intent?');
    record.set('facilitator_notes', 'Let participants disagree before converging. Press for the evidence behind each hypothesis. Do not reveal whether the activity is malicious. Keep the focus on the decision process, not the “right” answer. Reserve the last 15 minutes for debrief.');
    record.set('debrief', 'Compare the timelines participants built. Which decisions were reversible, and which were not? Where did confidence outrun evidence? What additional telemetry would have changed the outcome?');
    record.set('lessons_learned', 'Document reusable signals (key creation outside maintenance windows, privilege creep). Note where logging gaps created ambiguity. Capture one detection idea and one process improvement per participant group.');
    app.save(record);
  } catch (_) { /* example exercise absent — skip */ }

  // Default exercise_status for any other existing exercise work.
  const records = app.findAllRecords('ghost_work');
  for (const record of records) {
    if (record.get('kind') === 'exercise') {
      const current = record.get('exercise_status');
      if (!current || current === '') {
        record.set('exercise_status', 'open');
        app.save(record);
      }
    }
  }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  for (const name of [
    'exercise_type', 'scenario_type', 'difficulty', 'duration', 'format_mode',
    'delivery', 'exercise_status', 'industry', 'objectives',
    'initial_conditions', 'timeline', 'injects', 'evidence',
    'decision_points', 'facilitator_notes', 'debrief', 'lessons_learned',
  ]) {
    try { work.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  // Restore the previous update rule.
  work.updateRule =
    "@request.auth.moderator = true || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted'))" +
    ")";
  app.save(work);
});
