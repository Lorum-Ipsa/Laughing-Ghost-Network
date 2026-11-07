/// <reference path="../pb_data/types.d.ts" />

// Laughing Ghost is an open network, not an application-only club. Anyone who
// accepts the Code can create a Ghost identity; moderation governs
// contributions, verification, and trust-sensitive functions instead of
// gating basic membership. This migration:
//   1. Adds `developing_specialties` so members can distinguish what they
//      practice from what they are developing — more truthful than forcing
//      everyone to implicitly claim expertise.
//   2. Opens profile creation: drops the `member = false` constraint so a
//      member can be created as a full member of the network on join.

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  if (!profiles.fields.getByName('developing_specialties')) {
    profiles.fields.add(new TextField({ name: 'developing_specialties', max: 500 }));
  }

  // Open membership: accepting the Code is enough to hold a Ghost identity.
  profiles.createRule = "@request.auth.id != '' && owner = @request.auth.id && example = false";

  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  try { profiles.fields.removeByName('developing_specialties'); } catch (_) { /* already absent */ }

  profiles.createRule = "@request.auth.id != '' && owner = @request.auth.id && example = false && member = false";

  app.save(profiles);
});
