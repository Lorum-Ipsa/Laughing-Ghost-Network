/// <reference path="../pb_data/types.d.ts" />

// My Profile workspace — avatar support.
//
// Adds an optional avatar image field to `ghost_profiles` so members can upload
// a profile picture from the Ghost Space profile builder. The field is owner-
// writable (the existing updateRule already permits owner edits) and publicly
// readable (the list/view rules are `deleted != true`). Avatars are optional;
// the public profile falls back to the Ghost mark when none is set.
//
// Additive only. No rules changed.

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  if (!profiles.fields.getByName('avatar')) {
    profiles.fields.add(
      new FileField({
        name: 'avatar',
        maxSelect: 1,
        maxSize: 5242880, // 5 MB
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'],
        thumbs: ['100x100', '400x400'],
      }),
    );
    app.save(profiles);
  }
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  try { profiles.fields.removeByName('avatar'); app.save(profiles); } catch (_) { /* already absent */ }
});
