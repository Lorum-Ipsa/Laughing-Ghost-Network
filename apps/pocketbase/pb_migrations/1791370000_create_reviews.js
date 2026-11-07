/// <reference path="../pb_data/types.d.ts" />

// Completes the v1 relational data model: peer / community reviews.
//
// `ghost_work.review_status` (unreviewed / community_reviewed / peer_reviewed)
// already signals *whether* a contribution has been reviewed, but nothing
// records *who* reviewed it, *when*, or *what they found*. This collection
// closes that gap and makes the review workflow observable and accountable —
// a reviewer leaves a structured verdict (endorse / needs_revision / concerns)
// and findings against a published (or own draft) contribution.
//
// Design:
//   - One review per reviewer per work (unique index on work + owner).
//   - `profile` links the reviewer's public Ghost identity so a review can be
//     attributed pseudonymously without exposing the private account.
//   - Published reviews are public only when the related work is published;
//     draft reviews and reviews of unpublished work stay owner/moderator-only.
//   - Reviews are owner-created; moderators/admins may update or remove them.
//
// Additive only — no existing collection is modified.

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  const work = app.findCollectionByNameOrId('ghost_work');

  let reviews;
  try {
    reviews = app.findCollectionByNameOrId('ghost_reviews');
  } catch (_) {
    reviews = new Collection({
      name: 'ghost_reviews',
      type: 'base',
      // Public read only when the review is published AND the related work is
      // published. Drafts and reviews of unpublished work stay private to the
      // reviewer and moderators/admins.
      listRule:
        "(status = 'published' && work.status = 'published') || " +
        "(@request.auth.id != '' && owner = @request.auth.id) || " +
        "@request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule:
        "(status = 'published' && work.status = 'published') || " +
        "(@request.auth.id != '' && owner = @request.auth.id) || " +
        "@request.auth.moderator = true || @request.auth.role = 'admin'",
      // Any authenticated member may open a review on a published contribution.
      createRule:
        "@request.auth.id != '' && owner = @request.auth.id && work.status = 'published'",
      // The reviewer may edit their own review; moderators/admins may moderate.
      updateRule:
        "(@request.auth.id != '' && owner = @request.auth.id) || " +
        "@request.auth.moderator = true || @request.auth.role = 'admin'",
      deleteRule:
        "(@request.auth.id != '' && owner = @request.auth.id) || " +
        "@request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        // The reviewer's public Ghost identity — pseudonymous attribution
        // without exposing the private account.
        { name: 'profile', type: 'relation', collectionId: profiles.id, required: true, maxSelect: 1, cascadeDelete: true },
        {
          name: 'verdict',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['endorse', 'needs_revision', 'concerns'],
        },
        { name: 'body', type: 'text', required: true, max: 10000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['draft', 'published'],
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        // One review per reviewer per work.
        'CREATE UNIQUE INDEX idx_ghost_review_work_owner ON ghost_reviews (work, owner)',
      ],
    });
    app.save(reviews);
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('ghost_reviews')); } catch (_) { /* already absent */ }
});
