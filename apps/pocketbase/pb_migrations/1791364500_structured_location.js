/// <reference path="../pb_data/types.d.ts" />

// Replace the free-text `location` field with a disclosure-controlled location
// model. A Ghost chooses how much location detail to publish:
//   undisclosed | remote | country | region | city
// Country is the maximum detail ever expected; city/state/province are always
// optional and never required. The legacy `location` text field is left in
// place (unused) so no data is destroyed; all display and filtering now read
// the structured fields below, which default to "Undisclosed" — the network
// never exposes more location data than a Ghost has chosen to publish.

migrate((app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');

  const addField = (field) => {
    if (!profiles.fields.getByName(field.name)) profiles.fields.add(field);
  };

  addField(new SelectField({
    name: 'location_disclosure',
    maxSelect: 1,
    values: ['undisclosed', 'remote', 'country', 'region', 'city'],
  }));
  addField(new TextField({ name: 'location_country', max: 100 }));
  addField(new TextField({ name: 'location_region', max: 100 }));
  addField(new TextField({ name: 'location_city', max: 100 }));

  app.save(profiles);

  // Backfill the seeded example profiles with disclosure-aware locations so
  // the directory demonstrates country, remote, and city-level disclosure.
  const updates = {
    nullspectre: { location_disclosure: 'country', location_country: 'Romania', location_region: '', location_city: '' },
    quietbyte: { location_disclosure: 'remote', location_country: '', location_region: '', location_city: '' },
    echo_zero: { location_disclosure: 'city', location_country: 'Germany', location_region: '', location_city: 'Berlin' },
  };

  for (const [handle, data] of Object.entries(updates)) {
    try {
      const record = app.findFirstRecordByData('ghost_profiles', 'handle', handle);
      record.set('location_disclosure', data.location_disclosure);
      record.set('location_country', data.location_country);
      record.set('location_region', data.location_region);
      record.set('location_city', data.location_city);
      app.save(record);
    } catch (_) { /* example profile absent — skip */ }
  }
}, (app) => {
  const profiles = app.findCollectionByNameOrId('ghost_profiles');
  for (const name of ['location_disclosure', 'location_country', 'location_region', 'location_city']) {
    try { profiles.fields.removeByName(name); } catch (_) { /* already absent */ }
  }
  app.save(profiles);
});
