/// <reference path="../pb_data/types.d.ts" />

// Allow forward slash "/" in persistent Ghost handles and handle-change requests.
migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId('ghost_profiles');
    const profileHandle = profiles.fields.getByName('handle');
    profileHandle.pattern = '^[a-z0-9_/-]+$';
    app.save(profiles);

    const handleChanges = app.findCollectionByNameOrId('ghost_handle_changes');
    const requested = handleChanges.fields.getByName('requested_handle');
    requested.pattern = '^[a-z0-9_/-]+$';
    app.save(handleChanges);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId('ghost_profiles');
    const profileHandle = profiles.fields.getByName('handle');
    profileHandle.pattern = '^[a-z0-9_-]+$';
    app.save(profiles);

    const handleChanges = app.findCollectionByNameOrId('ghost_handle_changes');
    const requested = handleChanges.fields.getByName('requested_handle');
    requested.pattern = '^[a-z0-9_-]+$';
    app.save(handleChanges);
  },
);
