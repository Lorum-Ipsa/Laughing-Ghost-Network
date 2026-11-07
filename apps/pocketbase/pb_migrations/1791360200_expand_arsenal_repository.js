/// <reference path="../pb_data/types.d.ts" />

// Refine the Arsenal into a comprehensive cybersecurity artifact repository.
//
// 1. Expand ghost_work.kind with granular artifact types covering the whole
//    field: hunting/SIEM queries, YARA/Sigma/network rules, scripts, utilities,
//    IOC collections, threat feeds, runbooks, checklists, detection packs,
//    configuration baselines, hardening guides, policy templates, IR kits,
//    forensic artifacts, malware samples, attack simulations, adversary
//    emulation plans, exploit PoCs, test cases, and validation harnesses.
// 2. Add artifact metadata fields: validation_status (Draft / Tested /
//    Community Validated / Maintainer Validated / Deprecated), version, license,
//    platform, format (language/format), and tool (tool/technology).
// 3. Backfill the seeded example arsenal work with the new metadata.
//
// Additive only — existing kinds, fields, and rules are preserved.

migrate((app) => {
  // --- 1. Expand the work contribution kinds ---
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const kindValues = kind.values || [];
  const newKinds = [
    'hunting_queries', 'siem_queries', 'yara_rules', 'sigma_rules', 'network_rules',
    'scripts', 'utilities', 'ioc_collections', 'threat_feeds', 'runbooks',
    'checklists', 'detection_packs', 'config_baselines', 'hardening_guides',
    'policy_templates', 'ir_kits', 'forensic_artifacts', 'malware_samples',
    'attack_simulations', 'adversary_emulation', 'exploit_pocs', 'test_cases',
    'validation_harnesses',
  ];
  for (const k of newKinds) {
    if (!kindValues.includes(k)) kindValues.push(k);
  }
  kind.values = kindValues;
  app.save(work);

  // --- 2. Add artifact metadata fields ---
  const addField = (field) => {
    if (!work.fields.getByName(field.name)) work.fields.add(field);
  };
  addField(new SelectField({
    name: 'validation_status',
    required: false,
    maxSelect: 1,
    values: ['draft', 'tested', 'community_validated', 'maintainer_validated', 'deprecated'],
  }));
  addField(new TextField({ name: 'version', max: 50 }));
  addField(new TextField({ name: 'license', max: 100 }));
  addField(new TextField({ name: 'platform', max: 300 }));
  addField(new TextField({ name: 'format', max: 200 }));
  addField(new TextField({ name: 'tool', max: 300 }));
  app.save(work);

  // --- 3. Backfill the seeded example arsenal work ---
  const updates = {
    'Detecting suspicious access to LSASS': {
      validation_status: 'tested', version: '1.2.0', license: 'MIT',
      platform: 'Windows', format: 'Sigma', tool: 'Splunk, Sysmon',
    },
    'Log Lens — normalize before investigating': {
      validation_status: 'community_validated', version: '0.9.1', license: 'Apache-2.0',
      platform: 'Linux', format: 'Python', tool: 'Elastic, ELK',
    },
    'Detection Lab': {
      validation_status: 'tested', version: '2.0.0', license: 'MIT',
      platform: 'Multi-cloud', format: 'Terraform', tool: 'Terraform, Ansible',
    },
  };
  for (const [title, data] of Object.entries(updates)) {
    try {
      const record = app.findFirstRecordByData('ghost_work', 'title', title);
      record.set('validation_status', data.validation_status);
      record.set('version', data.version);
      record.set('license', data.license);
      record.set('platform', data.platform);
      record.set('format', data.format);
      record.set('tool', data.tool);
      app.save(record);
    } catch (_) { /* example work absent — skip */ }
  }

  // Default validation_status for any other existing arsenal work.
  const records = app.findAllRecords('ghost_work');
  for (const record of records) {
    const current = record.get('validation_status');
    if (!current || current === '') {
      record.set('validation_status', 'draft');
      app.save(record);
    }
  }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const removed = new Set([
    'hunting_queries', 'siem_queries', 'yara_rules', 'sigma_rules', 'network_rules',
    'scripts', 'utilities', 'ioc_collections', 'threat_feeds', 'runbooks',
    'checklists', 'detection_packs', 'config_baselines', 'hardening_guides',
    'policy_templates', 'ir_kits', 'forensic_artifacts', 'malware_samples',
    'attack_simulations', 'adversary_emulation', 'exploit_pocs', 'test_cases',
    'validation_harnesses',
  ]);
  kind.values = (kind.values || []).filter((v) => !removed.has(v));
  app.save(work);
  for (const name of ['validation_status', 'version', 'license', 'platform', 'format', 'tool']) {
    try { work.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  app.save(work);
});
