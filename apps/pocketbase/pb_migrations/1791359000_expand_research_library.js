/// <reference path="../pb_data/types.d.ts" />

// Refine the Research library so it covers the whole cybersecurity field.
//
// 1. Add three research-oriented contribution kinds — `analysis`, `experiment`,
//    `case_study` — so Research Type can be separated from Domain/Specialty.
// 2. Add a `domain` text field to ghost_work: the research domain or specialty
//    (e.g. "Cloud IAM Analysis"), distinct from free-form tags.
// 3. Add a `review_status` select field (unreviewed / peer_reviewed) to
//    ghost_work, separate from the publication `status` workflow, so research
//    can signal peer review independently of being published.
// 4. Backfill the seeded example work with domains and review statuses.
//
// Additive only — existing kinds, fields, and rules are preserved.

migrate((app) => {
  // --- 1. Expand the work contribution kinds ---
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const kindValues = kind.values || [];
  for (const k of ['analysis', 'experiment', 'case_study']) {
    if (!kindValues.includes(k)) kindValues.push(k);
  }
  kind.values = kindValues;
  app.save(work);

  // --- 2 & 3. Add domain and review_status fields ---
  if (!work.fields.getByName('domain')) {
    work.fields.add(new TextField({ name: 'domain', max: 250 }));
  }
  if (!work.fields.getByName('review_status')) {
    work.fields.add(new SelectField({
      name: 'review_status',
      required: false,
      maxSelect: 1,
      values: ['unreviewed', 'peer_reviewed'],
    }));
  }
  app.save(work);

  // --- 4. Backfill the seeded example work ---
  const updates = {
    'Cloud identities: the forgotten trust paths': { domain: 'Cloud IAM Analysis', review_status: 'peer_reviewed' },
    'Reconstructing a timeline from logs': { domain: 'Digital Forensics', review_status: 'peer_reviewed' },
    'Detecting suspicious access to LSASS': { domain: 'Threat Hunting', review_status: 'unreviewed' },
    'Log Lens — normalize before investigating': { domain: 'Log Analysis', review_status: 'unreviewed' },
    'Detection Lab': { domain: 'Detection Engineering', review_status: 'unreviewed' },
    'Table Talk #01 — Cloud incident': { domain: 'Cloud Security', review_status: 'unreviewed' },
  };
  for (const [title, data] of Object.entries(updates)) {
    try {
      const record = app.findFirstRecordByData('ghost_work', 'title', title);
      record.set('domain', data.domain);
      record.set('review_status', data.review_status);
      app.save(record);
    } catch (_) { /* example work absent — skip */ }
  }

  // Default review_status for any other existing work.
  const records = app.findAllRecords('ghost_work');
  for (const record of records) {
    const current = record.get('review_status');
    if (!current || current === '') {
      record.set('review_status', 'unreviewed');
      app.save(record);
    }
  }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const removed = new Set(['analysis', 'experiment', 'case_study']);
  kind.values = (kind.values || []).filter((v) => !removed.has(v));
  app.save(work);
  try { work.fields.removeByName('domain'); } catch (_) { /* already absent */ }
  try { work.fields.removeByName('review_status'); } catch (_) { /* already absent */ }
  app.save(work);
});
