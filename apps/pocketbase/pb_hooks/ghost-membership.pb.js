/// <reference path="../pb_data/types.d.ts" />
onRecordAfterUpdateSuccess((e) => {
  const owner = e.record.getString('owner');
  const profile = e.app.findFirstRecordByFilter('ghost_profiles', 'owner = {:owner}', { owner: owner });
  profile.set('member', e.record.getString('status') === 'accepted');
  e.app.save(profile);
  e.next();
}, 'ghost_applications');
