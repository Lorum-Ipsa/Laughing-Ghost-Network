/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  let collection;
  try { collection = app.findCollectionByNameOrId('ghost_reports'); } catch (_) {
    collection = new Collection({ name: 'ghost_reports', type: 'base', listRule: "@request.auth.moderator = true", viewRule: "@request.auth.moderator = true", createRule: "@request.auth.id != '' && owner = @request.auth.id", updateRule: null, deleteRule: "@request.auth.moderator = true", fields: [
      { name: 'owner', type: 'relation', collectionId: users.id, required: true, maxSelect: 1 },
      { name: 'subject', type: 'text', required: true, max: 180 },
      { name: 'body', type: 'text', required: true, max: 5000 },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ] }); app.save(collection);
  }
}, (app) => { try { app.delete(app.findCollectionByNameOrId('ghost_reports')); } catch (_) { /* Already absent. */ } });
