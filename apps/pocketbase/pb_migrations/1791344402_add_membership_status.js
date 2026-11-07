/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  if (!profiles.fields.getByName('member')) profiles.fields.add(new BoolField({ name: 'member' }));
  profiles.createRule = "@request.auth.id != '' && owner = @request.auth.id && example = false && member = false";
  profiles.updateRule = "@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:changed = false && @request.body.handle:changed = false && @request.body.example:changed = false && @request.body.member:changed = false";
  app.save(profiles);
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles'); profiles.fields.removeByName('member');
  profiles.createRule = "@request.auth.id != '' && owner = @request.auth.id && example = false";
  profiles.updateRule = "@request.auth.id != '' && owner = @request.auth.id && @request.body.owner:changed = false && @request.body.handle:changed = false && @request.body.example:changed = false";
  app.save(profiles);
});
