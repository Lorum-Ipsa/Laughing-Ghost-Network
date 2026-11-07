/// <reference path="../pb_data/types.d.ts" />

// Keeps ghost_external_identities in sync with a profile's free-text
// `external_links` field ("Platform: url" per line).
//
// The frontend still writes external_links as text; this hook reconciles the
// structured collection on every profile create/update so the collection is
// always current without requiring a frontend change. Reconciliation is
// key-based (platform + url): existing rows are preserved (keeping any future
// `verified` flag), new lines are added, and removed lines are deleted.

function syncIdentities(app, profile) {
  try {
    const raw = profile.getString('external_links') || '';
    const owner = profile.getString('owner');
    const profileId = profile.id;

    const desired = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(':');
      if (idx === -1) continue;
      const platform = trimmed.slice(0, idx).trim();
      const url = trimmed.slice(idx + 1).trim();
      if (!platform || !url) continue;
      desired.push({ platform, url });
    }

    const existing = app.findRecordsByFilter(
      'ghost_external_identities',
      'profile = {:pid}',
      '',
      500,
      0,
      { pid: profileId },
    );
    const byKey = new Map();
    for (const rec of existing) {
      byKey.set(rec.getString('platform') + '|' + rec.getString('url'), rec);
    }

    const col = app.findCollectionByNameOrId('ghost_external_identities');
    const seen = new Set();
    let sort = 0;
    for (const item of desired) {
      const key = item.platform + '|' + item.url;
      seen.add(key);
      sort += 10;
      if (!byKey.has(key)) {
        const rec = new Record(col);
        rec.set('owner', owner);
        rec.set('profile', profileId);
        rec.set('platform', item.platform);
        rec.set('url', item.url);
        rec.set('sort', sort);
        app.save(rec);
      } else {
        const rec = byKey.get(key);
        if (rec.getInt('sort') !== sort) {
          rec.set('sort', sort);
          app.save(rec);
        }
      }
    }

    for (const [key, rec] of byKey) {
      if (!seen.has(key)) app.delete(rec);
    }
  } catch (err) {
    app.logger().error('sync external identities failed', 'err', String(err));
  }
}

onRecordAfterCreateSuccess((e) => { syncIdentities(e.app, e.record); e.next(); }, 'ghost_profiles');
onRecordAfterUpdateSuccess((e) => { syncIdentities(e.app, e.record); e.next(); }, 'ghost_profiles');
