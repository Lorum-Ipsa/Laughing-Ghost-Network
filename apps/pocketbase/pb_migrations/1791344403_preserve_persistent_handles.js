/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  profiles.deleteRule = null;
  app.save(profiles);
  const users = app.findCollectionByNameOrId('users');
  users.deleteRule = null;
  app.save(users);
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles'); profiles.deleteRule = "@request.auth.id != '' && owner = @request.auth.id"; app.save(profiles);
  const users = app.findCollectionByNameOrId('users'); users.deleteRule = 'id = @request.auth.id'; app.save(users);
});
