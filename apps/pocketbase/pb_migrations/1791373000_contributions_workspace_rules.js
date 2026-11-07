/// <reference path="../pb_data/types.d.ts" />

// Contributions workspace — backend enablement.
//
// The Ghost Space Contributions workspace turns members into publishers with a
// Draft → Review → Revision → Published → Future revisions workflow. Two rule
// changes make that possible without weakening moderation:
//
//   1. ghost_work.updateRule — owners may edit the content of any of their own
//      work (including published work, which the revision hook snapshots into
//      version history) and may move work between the author-controlled
//      states: draft ↔ submitted, revision_requested → submitted/draft, and
//      archive of non-published work. Publication, rejection, and archiving of
//      published work stay moderator/admin-only — the owner can never publish
//      or unpublish their own work. kind, owner, author, example, and the
//      soft-delete flag stay locked for owners.
//
//   2. ghost_reviews list/view rules — a work's author may read published
//      reviews left on their work at any stage (not only once the work is
//      published), so the Contributions workspace can show reviewer feedback
//      while a submission is in review. Draft reviews stay reviewer-only.
//
// No schema fields change; only access rules.

migrate((app) => {
  // --- 1. ghost_work: author-controlled workflow transitions + revisions ---
  const work = app.findCollectionByNameOrId('ghost_work');
  work.updateRule =
    "@request.auth.moderator = true || @request.auth.role = 'admin' || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "@request.body.deleted:changed = false && (" +
    "@request.body.status:changed = false || " +
    "(status = 'draft' && @request.body.status = 'submitted') || " +
    "(status = 'draft' && @request.body.status = 'archived') || " +
    "(status = 'submitted' && @request.body.status = 'draft') || " +
    "(status = 'submitted' && @request.body.status = 'archived') || " +
    "(status = 'revision_requested' && @request.body.status = 'submitted') || " +
    "(status = 'revision_requested' && @request.body.status = 'draft') || " +
    "(status = 'revision_requested' && @request.body.status = 'archived') || " +
    "(status = 'rejected' && @request.body.status = 'draft') || " +
    "(status = 'rejected' && @request.body.status = 'submitted') || " +
    "(status = 'rejected' && @request.body.status = 'archived') || " +
    "(status = 'archived' && @request.body.status = 'draft')" +
    "))";
  app.save(work);

  // --- 2. ghost_reviews: authors see published reviews on their own work ---
  const reviews = app.findCollectionByNameOrId('ghost_reviews');
  const authorClause =
    "(@request.auth.id != '' && work.owner = @request.auth.id && status = 'published')";
  reviews.listRule =
    "(status = 'published' && work.status = 'published') || " +
    "(@request.auth.id != '' && owner = @request.auth.id) || " +
    authorClause + " || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  reviews.viewRule = reviews.listRule;
  app.save(reviews);
}, (app) => {
  // Restore the prior rules.
  const work = app.findCollectionByNameOrId('ghost_work');
  work.updateRule =
    "@request.auth.moderator = true || @request.auth.role = 'admin' || (" +
    "@request.auth.id != '' && owner = @request.auth.id && " +
    "@request.body.owner:changed = false && @request.body.author:changed = false && " +
    "@request.body.example:changed = false && @request.body.kind:changed = false && " +
    "@request.body.deleted:changed = false && " +
    "((kind = 'project' && @request.body.status:changed = false) || " +
    "(kind = 'exercise' && @request.body.status:changed = false) || " +
    "(status != 'published' && @request.body.status = 'submitted'))" +
    ")";
  app.save(work);

  const reviews = app.findCollectionByNameOrId('ghost_reviews');
  reviews.listRule =
    "(status = 'published' && work.status = 'published') || " +
    "(@request.auth.id != '' && owner = @request.auth.id) || " +
    "@request.auth.moderator = true || @request.auth.role = 'admin'";
  reviews.viewRule = reviews.listRule;
  app.save(reviews);
});
