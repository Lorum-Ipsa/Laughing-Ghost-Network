/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Add "Open to speaking" availability flag to Ghost profiles.
    const profiles = app.findCollectionByNameOrId('ghost_profiles');
    if (!profiles.fields.getByName('open_to_speaking')) {
      profiles.fields.add(new BoolField({ name: 'open_to_speaking' }));
    }
    app.save(profiles);

    const users = app.findCollectionByNameOrId('users');

    // 2. Saved searches — a member's reusable network search (query + filters).
    const savedSearches = new Collection({
      type: 'base',
      name: 'ghost_saved_searches',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true, max: 120 },
        { name: 'query', type: 'text', max: 500 },
        { name: 'filters', type: 'json', maxSize: 20000 },
        {
          name: 'owner',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(savedSearches);

    // 3. Structured collaboration requests between Ghosts. The sender owns the
    //    record; the recipient is a Ghost profile. The recipient (via
    //    recipient.owner) can accept or decline; the sender can withdraw.
    const requests = new Collection({
      type: 'base',
      name: 'ghost_collaboration_requests',
      listRule:
        "owner = @request.auth.id || recipient.owner = @request.auth.id",
      viewRule:
        "owner = @request.auth.id || recipient.owner = @request.auth.id",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "recipient.owner = @request.auth.id",
      deleteRule:
        "owner = @request.auth.id || recipient.owner = @request.auth.id",
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          name: 'recipient',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: profiles.id,
          cascadeDelete: true,
        },
        {
          name: 'request_type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'project_collaboration',
            'research_collaboration',
            'peer_review',
            'table_talk',
            'mentorship',
            'speaking',
            'general',
          ],
        },
        { name: 'message', type: 'text', required: true, max: 1000 },
        {
          name: 'related_work',
          type: 'relation',
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('ghost_work').id,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pending', 'accepted', 'declined'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(requests);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId('ghost_profiles');
    try { profiles.fields.removeByName('open_to_speaking'); } catch (_) { /* already gone */ }
    app.save(profiles);

    try { app.delete(app.findCollectionByNameOrId('ghost_collaboration_requests')); } catch (_) { /* not present */ }
    try { app.delete(app.findCollectionByNameOrId('ghost_saved_searches')); } catch (_) { /* not present */ }
  },
);
