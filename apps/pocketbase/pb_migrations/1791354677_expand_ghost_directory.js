/// <reference path="../pb_data/types.d.ts" />

// Expand ghost_profiles into a full practitioner directory: skills, tools,
// platform, industry, location, working languages, and availability flags.
// Specialties stay a comma-separated text field (multiple values) but the
// canonical grouped list now lives in the frontend data file. The existing
// `language` select remains the author's ORIGINAL content language; the new
// `languages` text field records the languages a Ghost works in for directory
// filtering.

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  const addField = (field) => {
    if (!profiles.fields.getByName(field.name)) profiles.fields.add(field);
  };

  addField(new TextField({ name: 'skills', max: 500 }));
  addField(new TextField({ name: 'tools', max: 500 }));
  addField(new TextField({ name: 'platform', max: 300 }));
  addField(new TextField({ name: 'industry', max: 300 }));
  addField(new TextField({ name: 'location', max: 200 }));
  addField(new TextField({ name: 'languages', max: 300 }));
  addField(new BoolField({ name: 'available_for_work' }));
  addField(new BoolField({ name: 'open_to_collaboration' }));

  app.save(profiles);

  // Backfill the seeded example profiles with directory data so the directory
  // demonstrates evidence, filters, and search out of the box.
  const updates = {
    nullspectre: {
      specialties: 'Detection Engineering, Threat Hunting',
      skills: 'Windows, Sigma, KQL, EDR, Sysmon',
      tools: 'Sysmon, Splunk, Sigma, ELK',
      platform: 'Windows',
      industry: 'Healthcare',
      location: 'Remote, EU',
      languages: 'English, Romanian',
      available_for_work: true,
      open_to_collaboration: true,
    },
    quietbyte: {
      specialties: 'Cloud, IAM, Security Engineering',
      skills: 'AWS, Azure, IAM, Kubernetes',
      tools: 'Terraform, Prowler, CloudTrail',
      platform: 'Cloud',
      industry: 'Finance',
      location: 'Remote, NA',
      languages: 'English, Spanish',
      available_for_work: false,
      open_to_collaboration: true,
    },
    echo_zero: {
      specialties: 'DFIR, Reverse Engineering, Malware Analysis',
      skills: 'Memory Analysis, Static Analysis, Debugging',
      tools: 'Volatility, Ghidra, IDA, Wireshark',
      platform: 'Linux, Windows',
      industry: 'Telecom',
      location: 'Berlin, DE',
      languages: 'English, German',
      available_for_work: true,
      open_to_collaboration: false,
    },
  };

  for (const [handle, data] of Object.entries(updates)) {
    try {
      const record = app.findFirstRecordByData('ghost_profiles', 'handle', handle);
      record.set('specialties', data.specialties);
      record.set('skills', data.skills);
      record.set('tools', data.tools);
      record.set('platform', data.platform);
      record.set('industry', data.industry);
      record.set('location', data.location);
      record.set('languages', data.languages);
      record.set('available_for_work', data.available_for_work);
      record.set('open_to_collaboration', data.open_to_collaboration);
      app.save(record);
    } catch (_) { /* example profile absent — skip */ }
  }
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  for (const name of ['skills', 'tools', 'platform', 'industry', 'location', 'languages', 'available_for_work', 'open_to_collaboration']) {
    try { profiles.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  app.save(profiles);
});
