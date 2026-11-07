/// <reference path="../pb_data/types.d.ts" />

// Backend foundation — part 2: relational collections for version history,
// audit logging, file storage, and handle-change requests.
//
// These complete the relationship model so artifacts can link to authors,
// research, detections, tools, projects, and exercises — and so every
// important state change is recoverable and accountable.
//
//   ghost_revisions     — version history snapshots of ghost_work content.
//   ghost_audit_log     — moderator / account action audit trail.
//   ghost_attachments   — file storage (screenshots, PDFs, datasets, evidence).
//   ghost_handle_changes — moderated handle-change requests (handles are persistent).
//
// Additive only — no existing collection is modified.

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const work = app.findCollectionByNameOrId('ghost_work');
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  // --- 1. Version history ---
  let revisions;
  try {
    revisions = app.findCollectionByNameOrId('ghost_revisions');
  } catch (_) {
    revisions = new Collection({
      name: 'ghost_revisions',
      type: 'base',
      // Owner + moderators/admins may read their work's history. Writes are
      // system-only (the revision hook snapshots on every save).
      listRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      viewRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', max: 180 },
        { name: 'summary', type: 'text', max: 500 },
        { name: 'body', type: 'text', max: 50000 },
        { name: 'code', type: 'text', max: 50000 },
        { name: 'tags', type: 'text', max: 250 },
        { name: 'version', type: 'number' },
        { name: 'reason', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(revisions);
  }

  // --- 2. Audit log ---
  let audit;
  try {
    audit = app.findCollectionByNameOrId('ghost_audit_log');
  } catch (_) {
    audit = new Collection({
      name: 'ghost_audit_log',
      type: 'base',
      // Moderators/admins only. Writes are system-only (hooks).
      listRule: "@request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule: "@request.auth.moderator = true || @request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'actor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: true },
        { name: 'action', type: 'select', required: true, maxSelect: 1, values: [
          'work_published', 'work_rejected', 'work_archived', 'work_revision_requested', 'work_deleted',
          'work_restored', 'application_accepted', 'application_declined', 'handle_change_approved',
          'handle_change_declined', 'report_submitted', 'account_suspended', 'role_changed', 'soft_delete',
        ] },
        { name: 'target_type', type: 'text', max: 60 },
        { name: 'target_id', type: 'text', max: 60 },
        { name: 'details', type: 'text', max: 5000 },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(audit);
  }

  // --- 3. Attachments (file storage) ---
  let attachments;
  try {
    attachments = app.findCollectionByNameOrId('ghost_attachments');
  } catch (_) {
    attachments = new Collection({
      name: 'ghost_attachments',
      type: 'base',
      // Public read when the related work is published; otherwise owner/moderator.
      listRule: "work.status = 'published' || (@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true || @request.auth.role = 'admin'",
      viewRule: "work.status = 'published' || (@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'work', type: 'relation', collectionId: work.id, required: true, maxSelect: 1, cascadeDelete: true },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 26214400,
          mimeTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
            'application/pdf', 'text/plain', 'text/csv', 'application/json',
            'application/zip', 'application/gzip', 'application/x-yaml', 'text/yaml',
            'application/octet-stream',
          ],
        },
        { name: 'name', type: 'text', max: 200 },
        { name: 'description', type: 'text', max: 1000 },
        { name: 'kind', type: 'select', maxSelect: 1, values: ['screenshot', 'dataset', 'pdf', 'evidence', 'attachment', 'code_sample'] },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(attachments);
  }

  // --- 4. Handle-change requests ---
  let handleChanges;
  try {
    handleChanges = app.findCollectionByNameOrId('ghost_handle_changes');
  } catch (_) {
    handleChanges = new Collection({
      name: 'ghost_handle_changes',
      type: 'base',
      // Owner + moderators/admins may read. Owner creates; moderators/admins decide.
      listRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      viewRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.auth.moderator = true || @request.auth.role = 'admin')",
      createRule: "@request.auth.id != '' && owner = @request.auth.id && status = 'pending'",
      updateRule: "@request.auth.moderator = true || @request.auth.role = 'admin'",
      deleteRule: "(@request.auth.id != '' && owner = @request.auth.id) || @request.auth.moderator = true || @request.auth.role = 'admin'",
      fields: [
        { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'profile', type: 'relation', collectionId: profiles.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'current_handle', type: 'text', required: true, max: 40 },
        { name: 'requested_handle', type: 'text', required: true, max: 40, pattern: '^[a-z0-9_-]+$' },
        { name: 'reason', type: 'text', max: 1000 },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'approved', 'declined'] },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(handleChanges);
  }
}, (app) => {
  for (const name of ['ghost_handle_changes', 'ghost_attachments', 'ghost_audit_log', 'ghost_revisions']) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already absent */ }
  }
});
