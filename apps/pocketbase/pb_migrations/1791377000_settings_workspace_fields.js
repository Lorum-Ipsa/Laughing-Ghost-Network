/// <reference path="../pb_data/types.d.ts" />

// Settings workspace backend.
//
// Adds privacy, identity, and translation-preference fields to ghost_profiles
// so the Ghost Space Settings workspace can control what profile information is
// public, manage availability/collaboration visibility, and choose interface +
// translation behaviour — all without exposing admin roles or privileged
// settings to normal Ghosts.
//
// The existing updateRule already locks owner/handle/example/member/deleted
// from self-edit; the new fields below are owner-writable by design (they are
// personal preferences, not privileged). No rule is changed.
//
// Additive only.

const LANGUAGE_VALUES = [
  'en', 'fr', 'es', 'de', 'pt', 'it', 'nl', 'pl', 'ru', 'uk', 'sv',
  'ja', 'zh', 'ko', 'ar', 'he', 'hi', 'tr', 'vi', 'id', 'fa', 'other',
];

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  const add = (field) => {
    if (!profiles.fields.getByName(field.name)) profiles.fields.add(field);
  };

  // Identity
  add(new TextField({ name: 'display_name', max: 100 }));
  add(new TextField({ name: 'pronouns', max: 40 }));

  // Privacy / visibility
  add(new BoolField({ name: 'show_external_identities' }));
  add(new BoolField({ name: 'show_language_proficiency' }));
  add(new BoolField({ name: 'allow_recruiter_contact' }));

  // Translation preferences
  add(new SelectField({ name: 'preferred_translation_language', maxSelect: 1, values: LANGUAGE_VALUES }));
  add(new BoolField({ name: 'always_show_original' }));
  add(new BoolField({ name: 'auto_translate' }));
  add(new BoolField({ name: 'never_translate_technical' }));
  add(new SelectField({ name: 'preferred_publication_language', maxSelect: 1, values: LANGUAGE_VALUES }));

  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  for (const name of [
    'display_name', 'pronouns',
    'show_external_identities', 'show_language_proficiency', 'allow_recruiter_contact',
    'preferred_translation_language', 'always_show_original', 'auto_translate',
    'never_translate_technical', 'preferred_publication_language',
  ]) {
    try { profiles.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  app.save(profiles);
});
