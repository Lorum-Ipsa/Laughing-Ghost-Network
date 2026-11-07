/// <reference path="../pb_data/types.d.ts" />

// "Choose your Ghost" avatar system.
//
// Adds two fields to `ghost_profiles`:
//   - `avatar_template` (text): a composable template key like
//     "mischief:teal:grid" that selects a branded Laughing Ghost avatar
//     variant (expression : accent : background). Rendered client-side as
//     SVG, so no file storage is needed for templates. Empty means "use the
//     handle-derived default", which every Ghost gets automatically.
//   - `avatar_visibility` (select): public | members | hidden. Controls who
//     sees the chosen avatar. The existing `avatar` file field remains for
//     optional custom image uploads (logo, artwork, photograph — never
//     required, never required to be a real-person photo).
//
// Additive only. No existing rules changed. The owner-scoped updateRule on
// ghost_profiles already permits the owner to edit these fields, and the
// privileged-field lock in the updateRule guards `owner`/`handle`/`example`/
// `member`/`deleted` — `avatar_template` and `avatar_visibility` are
// non-privileged presentation fields, safe for the owner to set.

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  if (!profiles.fields.getByName('avatar_template')) {
    profiles.fields.add(
      new TextField({
        name: 'avatar_template',
        max: 60,
      }),
    );
  }

  if (!profiles.fields.getByName('avatar_visibility')) {
    profiles.fields.add(
      new SelectField({
        name: 'avatar_visibility',
        maxSelect: 1,
        values: ['public', 'members', 'hidden'],
      }),
    );
  }

  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  try { profiles.fields.removeByName('avatar_template'); } catch (_) { /* already absent */ }
  try { profiles.fields.removeByName('avatar_visibility'); } catch (_) { /* already absent */ }
  app.save(profiles);
});
