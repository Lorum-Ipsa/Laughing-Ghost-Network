/// <reference path="../pb_data/types.d.ts" />

// Internationalization: record the author's original language on member-created
// content, and add a collection for reader-facing translations.
//
// - `language` on ghost_work / ghost_profiles is the ORIGINAL, authoritative
//   language of the content. It is never overwritten by a translation.
// - `ghost_translations` stores opt-in translations (machine or human) of a
//   published work's prose fields (title, summary, body). Code, commands,
//   hashes, detection rules and other technical artifacts are NEVER translated,
//   so they are not stored here — the original `code` on ghost_work is always
//   shown verbatim.
// - Translations are public only when the related work is published.

const LANGUAGE_CODES = [
  'en', 'fr', 'es', 'de', 'pt', 'it', 'nl', 'pl', 'ru', 'uk', 'sv',
  'ja', 'zh', 'ko', 'ar', 'he', 'hi', 'tr', 'vi', 'id', 'fa', 'other',
];

migrate((app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  if (!work.fields.getByName('language')) {
    work.fields.add(new SelectField({
      name: 'language',
      required: false,
      maxSelect: 1,
      values: LANGUAGE_CODES,
    }));
  }
  app.save(work);

  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  if (!profiles.fields.getByName('language')) {
    profiles.fields.add(new SelectField({
      name: 'language',
      required: false,
      maxSelect: 1,
      values: LANGUAGE_CODES,
    }));
  }
  app.save(profiles);

  // Reader-facing translations of published work prose.
  let translations;
  try {
    translations = app.findCollectionByNameOrId('ghost_translations');
  } catch (_) {
    translations = new Collection({
      name: 'ghost_translations',
      type: 'base',
      // Public read only when the related work is published. Writes are
      // server-side only (moderation / future machine-translation pipeline).
      listRule: "work.status = 'published'",
      viewRule: "work.status = 'published'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'work',
          type: 'relation',
          collectionId: work.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'language',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: LANGUAGE_CODES,
        },
        { name: 'title', type: 'text', required: true, max: 180 },
        { name: 'summary', type: 'text', required: true, max: 500 },
        { name: 'body', type: 'text', required: true, max: 50000 },
        {
          name: 'source',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['machine', 'human'],
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_ghost_translation ON ghost_translations (work, language)',
      ],
    });
    app.save(translations);
  }

  // Backfill existing content with its original language. The seeded example
  // work and profiles are written in English.
  const backfill = (collectionName) => {
    const records = app.findAllRecords(collectionName);
    for (const record of records) {
      const current = record.get('language');
      if (!current || current === '') {
        record.set('language', 'en');
        app.save(record);
      }
    }
  };
  try { backfill('ghost_work'); } catch (_) { /* no rows */ }
  try { backfill('ghost_profiles'); } catch (_) { /* no rows */ }
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  try { work.fields.removeByName('language'); app.save(work); } catch (_) { /* already absent */ }
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  try { profiles.fields.removeByName('language'); app.save(profiles); } catch (_) { /* already absent */ }
  try { app.delete(app.findCollectionByNameOrId('ghost_translations')); } catch (_) { /* already absent */ }
});
