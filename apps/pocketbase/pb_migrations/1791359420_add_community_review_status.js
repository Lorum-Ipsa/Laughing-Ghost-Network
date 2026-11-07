/// <reference path="../pb_data/types.d.ts" />

// Add a third review status — `community_reviewed` — between "unreviewed" and
// "peer_reviewed", so the network can distinguish informal practitioner review
// from a more formal peer-review process. Additive: existing rows keep their
// current value; the new option is available for moderators to set.

migrate((app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const field = work.fields.getByName('review_status');
  field.values = ['unreviewed', 'community_reviewed', 'peer_reviewed'];
  app.save(work);
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const field = work.fields.getByName('review_status');
  field.values = ['unreviewed', 'peer_reviewed'];
  app.save(work);
});
