/// <reference path="../pb_data/types.d.ts" />

// Add an "intelligence" contribution type (threat intelligence reports) to the
// ghost_work.kind select. Additive only — existing kinds are preserved.

migrate((app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const values = kind.values || [];
  if (!values.includes('intelligence')) {
    kind.values = [...values, 'intelligence'];
  }
  app.save(work);
}, (app) => {
  const work = app.findCollectionByNameOrId('ghost_work');
  const kind = work.fields.getByName('kind');
  const values = kind.values || [];
  kind.values = values.filter((v) => v !== 'intelligence');
  app.save(work);
});
