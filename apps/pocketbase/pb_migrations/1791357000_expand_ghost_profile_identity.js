/// <reference path="../pb_data/types.d.ts" />

// Turn the Ghost profile into a canonical cybersecurity identity page.
//
// 1. Expand ghost_work.kind to cover the full field: investigations, malware
//    analysis, vulnerability research, rules, queries, datasets, playbooks,
//    frameworks, advisories, presentations, papers, labs, code, peer review,
//    and community contributions — alongside the existing kinds.
// 2. Add profile fields for collaboration interests, external verified
//    identities, featured work, and the open_to_research / open_to_mentorship
//    availability flags.
//
// Additive only — existing kinds, fields, and rules are preserved.

migrate((app) => {
  // --- 1. Expand the work contribution kinds ---
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const kindValues = kind.values || [];
  const newKinds = [
    'investigation', 'malware_analysis', 'vulnerability_research',
    'rules', 'queries', 'datasets', 'playbooks', 'frameworks',
    'advisories', 'presentations', 'papers', 'labs', 'code',
    'peer_review', 'community',
  ];
  for (const k of newKinds) {
    if (!kindValues.includes(k)) kindValues.push(k);
  }
  kind.values = kindValues;
  app.save(work);

  // --- 2. Add the new profile identity fields ---
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  const addField = (field) => {
    if (!profiles.fields.getByName(field.name)) profiles.fields.add(field);
  };
  addField(new TextField({ name: 'collaboration_interests', max: 1000 }));
  addField(new TextField({ name: 'external_links', max: 2000 }));
  addField(new TextField({ name: 'featured_work', max: 500 }));
  addField(new BoolField({ name: 'open_to_research' }));
  addField(new BoolField({ name: 'open_to_mentorship' }));
  app.save(profiles);

  // --- 3. Backfill the seeded example profiles so the identity page demos ---
  const updates = {
    nullspectre: {
      collaboration_interests: 'Detection engineering collaboration, Threat hunting partnerships, Open-source tooling, Table Talks, Conference talks',
      external_links: 'GitHub: https://github.com/nullspectre\nHack The Box: https://app.hackthebox.com/profile/nullspectre\nCyberDefenders: https://cyberdefenders.org/p/nullspectre',
      open_to_research: true,
      open_to_mentorship: true,
    },
    quietbyte: {
      collaboration_interests: 'Cloud security research, IAM architecture reviews, Open-source tooling, Research partners',
      external_links: 'GitHub: https://github.com/quietbyte\nCredly: https://www.credly.com/users/quietbyte\nPersonal website: https://quietbyte.dev',
      open_to_research: true,
      open_to_mentorship: false,
    },
    echo_zero: {
      collaboration_interests: 'Malware research collaboration, DFIR projects, Open-source tooling, Conference talks, Research partners',
      external_links: 'GitHub: https://github.com/echo-zero\nHack The Box: https://app.hackthebox.com/profile/echo_zero\nORCID: https://orcid.org/0000-0000-0000-0000',
      open_to_research: true,
      open_to_mentorship: true,
    },
  };
  for (const [handle, data] of Object.entries(updates)) {
    try {
      const record = app.findFirstRecordByData('ghost_profiles', 'handle', handle);
      record.set('collaboration_interests', data.collaboration_interests);
      record.set('external_links', data.external_links);
      record.set('open_to_research', data.open_to_research);
      record.set('open_to_mentorship', data.open_to_mentorship);
      app.save(record);
    } catch (_) { /* example profile absent — skip */ }
  }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const removed = new Set([
    'investigation', 'malware_analysis', 'vulnerability_research',
    'rules', 'queries', 'datasets', 'playbooks', 'frameworks',
    'advisories', 'presentations', 'papers', 'labs', 'code',
    'peer_review', 'community',
  ]);
  kind.values = (kind.values || []).filter((v) => !removed.has(v));
  app.save(work);

  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  for (const name of ['collaboration_interests', 'external_links', 'featured_work', 'open_to_research', 'open_to_mentorship']) {
    try { profiles.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  app.save(profiles);
});
